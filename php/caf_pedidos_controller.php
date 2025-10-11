<?php
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/verificar_sesion.php';
header('Content-Type: application/json; charset=utf-8');

function read_json_body()
{
    $raw = file_get_contents('php://input');
    if (!$raw)
        return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}
function respond($arr, $code = 200)
{
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}
function generar_codigo(mysqli $db, $maxIntentos = 10)
{
    for ($i = 0; $i < $maxIntentos; $i++) {
        $base = strtoupper(bin2hex(random_bytes(3)));
        $codigo = substr($base, 0, 3) . '-' . substr($base, 3, 2);
        $stmt = $db->prepare("SELECT id FROM caf_pedidos WHERE codigo=? LIMIT 1");
        $stmt->bind_param('s', $codigo);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows === 0) {
            $stmt->close();
            return $codigo;
        }
        $stmt->close();
    }
    return 'PD-' . date('His');
}
function generar_folio(mysqli $db)
{
    // V-YYYYMMDD-#### secuencial del día
    $prefix = 'V-' . date('Ymd') . '-';
    $stmt = $db->prepare("SELECT COUNT(*) FROM caf_ventas WHERE folio LIKE CONCAT(?, '%')");
    $stmt->bind_param('s', $prefix);
    $stmt->execute();
    $stmt->bind_result($n);
    $stmt->fetch();
    $stmt->close();
    $num = (int) $n + 1;
    return $prefix . str_pad((string) $num, 4, '0', STR_PAD_LEFT);
}
function recalc_totales(array $items, $descuentoIn = 0, $impuestosIn = 0, $propinaIn = 0)
{
    $subtotal = 0;
    foreach ($items as $it) {
        $cantidad = max(1, (float) ($it['cantidad'] ?? 0));
        $pu = (float) ($it['precio_unit'] ?? 0);
        $subtotal += ($cantidad * $pu);
    }
    $descuento = max(0, (float) $descuentoIn);
    $impuestos = max(0, (float) $impuestosIn);
    $propina = max(0, (float) $propinaIn);
    $total = $subtotal - $descuento + $impuestos + $propina;
    if ($total < 0)
        $total = 0;
    $fmt = fn($n) => number_format((float) $n, 2, '.', '');
    return [
        'subtotal' => (float) $fmt($subtotal),
        'descuento' => (float) $fmt($descuento),
        'impuestos' => (float) $fmt($impuestos),
        'propina' => (float) $fmt($propina),
        'total' => (float) $fmt($total),
    ];
}
function obtener_pedido_y_items(mysqli $db, $pedido_id)
{
    // Pedido
    $sqlP = "SELECT id, codigo, person_code, origen, estado, notas,
                  subtotal, descuento, impuestos, propina, total
           FROM caf_pedidos WHERE id=? LIMIT 1";
    $stmt = $db->prepare($sqlP);
    $stmt->bind_param('i', $pedido_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $pedido = $res->fetch_assoc();
    $stmt->close();
    if (!$pedido)
        return [null, []];

    // Items
    $sqlI = "SELECT id, producto_id, nombre_snapshot, descripcion_snapshot,
                  cantidad, precio_unit, total_linea, tamano_key, tamano_label, nota
           FROM caf_pedidos_items WHERE pedido_id=?";
    $stmt = $db->prepare($sqlI);
    $stmt->bind_param('i', $pedido_id);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return [$pedido, $items];
}
// Convierte lo que venga en face (base64 puro, dataURL, url) a un dataURL válido
function normalize_face_to_dataurl($v) {
    if (!$v) return null;
    $s = trim((string)$v);
    if ($s === '' || strtolower($s) === 'null') return null;

    // Ya es dataURL
    if (stripos($s, 'data:image') === 0) return $s;

    // Es URL http/https o ruta absoluta: devuélvela tal cual
    if (preg_match('#^(https?://|/)#i', $s)) return $s;

    // Base64 "puro": anteponer mime
    $b64 = preg_replace('/^base64,?/i', '', $s);
    return 'data:image/jpeg;base64,' . $b64;
}


$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? null;
global $conexion;

/* ===========================
 * GET handlers
 * =========================== */
if ($method === 'GET') {
    $action = $_GET['action'] ?? null;

    /* --- GET: validar_person_code ------------------------------------------ */
    /* --- GET: validar_person_code (prioriza clientes.personCode) ------------- */
    if ($action === 'validar_person_code') {
        $person_code = trim((string) ($_GET['person_code'] ?? ''));
        if ($person_code === '') {
            respond(['success' => false, 'error' => 'person_code requerido'], 422);
        }

        // BD actual
        $dbNameRes = $conexion->query("SELECT DATABASE()");
        [$dbName] = $dbNameRes->fetch_row();

        // 1) Prioridad: tabla clientes con personCode / person_code
        $hasClientes = false;
        $colClientes = 'personCode';

        $stmt = $conexion->prepare("
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=? AND TABLE_NAME='clientes'
      AND COLUMN_NAME IN ('personCode','person_code')
    LIMIT 1
  ");
        $stmt->bind_param('s', $dbName);
        $stmt->execute();
        $rs = $stmt->get_result();
        if ($r = $rs->fetch_assoc()) {
            $hasClientes = true;
            $colClientes = $r['COLUMN_NAME']; // personCode o person_code
        }
        $stmt->close();

        if ($hasClientes) {
            // Consulta directa a clientes
            $sql = "SELECT * FROM `clientes` WHERE `{$colClientes}`=? LIMIT 1";
            $s2 = $conexion->prepare($sql);
            $s2->bind_param('s', $person_code);
            $s2->execute();
            $res = $s2->get_result();
            $row = $res->fetch_assoc();
            $s2->close();

            if (!$row) {
                respond(['success' => true, 'found' => false]);
            }

            // Armar nombre legible con las columnas que tiene tu tabla
            $nombre = null;
            if (isset($row['nombre']) && isset($row['apellido'])) {
                $nombre = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
            } elseif (isset($row['nombre'])) {
                $nombre = (string) $row['nombre'];
            } elseif (isset($row['nombre_completo'])) {
                $nombre = (string) $row['nombre_completo'];
            }

            respond([
                'success' => true,
                'found' => true,
                'person' => [
                    'person_code' => $row[$colClientes],
                    'nombre' => $nombre,
                    'face' => normalize_face_to_dataurl($row['face_icon'] ?? ($row['face'] ?? null)),
                ]
            ]);
        }

        // 2) Fallback: autodetección (excluye 'caf_%' para no agarrar pedidos/ventas)
        $stmt = $conexion->prepare("
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND COLUMN_NAME IN ('person_code','personCode')
      AND TABLE_NAME NOT LIKE 'caf\\_%' ESCAPE '\\'
    ORDER BY (COLUMN_NAME='person_code') DESC, TABLE_NAME
    LIMIT 1
  ");
        $stmt->bind_param('s', $dbName);
        $stmt->execute();
        $rs = $stmt->get_result();
        $row = $rs->fetch_assoc();
        $stmt->close();

        if (!$row) {
            // No hay dónde validar → UI decidirá continuar
            respond(['success' => true, 'found' => false]);
        }

        $table = $row['TABLE_NAME'];
        $col = $row['COLUMN_NAME']; // person_code o personCode

        $sql = "SELECT * FROM `$table` WHERE `$col` = ? LIMIT 1";
        $stmt2 = $conexion->prepare($sql);
        $stmt2->bind_param('s', $person_code);
        $stmt2->execute();
        $res2 = $stmt2->get_result();
        $row2 = $res2->fetch_assoc();
        $stmt2->close();

        if (!$row2) {
            respond(['success' => true, 'found' => false]);
        }

        $nombre = null;
        if (isset($row2['nombre']) && isset($row2['apellido'])) {
            $nombre = trim(($row2['nombre'] ?? '') . ' ' . ($row2['apellido'] ?? ''));
        } elseif (isset($row2['nombre'])) {
            $nombre = (string) $row2['nombre'];
        } elseif (isset($row2['nombre_completo'])) {
            $nombre = (string) $row2['nombre_completo'];
        } elseif (isset($row2['name'])) {
            $nombre = (string) $row2['name'];
        }
        $img = $row2['face_icon'] ?? ($row2['face'] ?? ($row2['foto'] ?? ($row2['avatar'] ?? null)));

        respond([
            'success' => true,
            'found' => true,
            'person' => [
                'person_code' => $row2[$col],
                'nombre' => $nombre,
                'face'        => normalize_face_to_dataurl($img),
            ]
        ]);
    }



    /* --- GET: catálogo (categorías + productos + tamaños) ------------------ */
if ($action === 'catalogo') {
    $soloActivos   = (int)($_GET['solo_activos'] ?? 1);
    $ocultarVacias = (int)($_GET['ocultar_vacias'] ?? 0);
    $q             = trim((string)($_GET['q'] ?? ''));

    // Filtros dinámicos
    $on = "p.categoria_id = c.id";
    if ($soloActivos) $on .= " AND p.activo=1";
    if ($q !== '')     $on .= " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";

    $where = [];
    if ($soloActivos) $where[] = "c.activo=1";
    $whereSQL = $where ? ("WHERE ".implode(" AND ", $where)) : "";

    // Traemos categorías, productos y posibles tamaños de la TABLA.
    // También traemos p.tamanos (JSON) para fallback si no hay filas en la tabla.
    $sql = "
      SELECT
        c.id            AS cat_id,
        c.nombre        AS cat_nombre,

        p.id            AS prod_id,
        p.nombre        AS prod_nombre,
        p.descripcion   AS prod_desc,
        p.imagen_url    AS prod_img,
        p.tamanos       AS prod_tamanos_json,

        t.id            AS tam_id,
        t.etiqueta      AS tam_label,
        t.precio        AS tam_precio,
        t.orden         AS tam_orden,
        t.activo        AS tam_activo
      FROM caf_categorias c
      LEFT JOIN caf_productos p
        ON {$on}
      LEFT JOIN caf_productos_tamanos t
        ON t.producto_id = p.id
       AND t.activo = 1
      {$whereSQL}
      ORDER BY c.orden, c.nombre, p.orden, p.nombre, t.orden, t.etiqueta
    ";

    if ($q !== '') {
        $like = "%$q%";
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param('ss', $like, $like);
        $stmt->execute();
        $rs = $stmt->get_result();
    } else {
        $rs = $conexion->query($sql);
    }

    // Construcción de estructura
    $cats  = [];
    $prods = []; // [prod_id] => info acumulada

    while ($row = $rs->fetch_assoc()) {
        $cid = (int)$row['cat_id'];
        if (!isset($cats[$cid])) {
            $cats[$cid] = [
                'id'          => $cid,
                'nombre'      => $row['cat_nombre'],
                'descripcion' => '',
                'productos'   => []
            ];
        }

        if (!is_null($row['prod_id'])) {
            $pid = (int)$row['prod_id'];
            if (!isset($prods[$pid])) {
                $prods[$pid] = [
                    'id'          => $pid,
                    'nombre'      => (string)$row['prod_nombre'],
                    'descripcion' => (string)($row['prod_desc'] ?? ''),
                    'imagen_url'  => (string)($row['prod_img'] ?? null),
                    'sizes'       => [],                      // de tabla
                    'tamanos_json'=> (string)($row['prod_tamanos_json'] ?? ''), // fallback
                    'cat_id'      => $cid,
                ];
            }

            // Agregar tamaño desde la TABLA si existe
            if (!is_null($row['tam_id'])) {
                $label  = (string)$row['tam_label'];
                $precio = (float)$row['tam_precio'];
                $orden  = (int)$row['tam_orden'];
                $key    = strtolower(preg_replace('/\s+/', '_', $label));
                if ($key === '') $key = 'op_'.$row['tam_id'];

                $prods[$pid]['sizes'][] = [
                    'key'    => $key,
                    'label'  => $label,
                    'precio' => $precio,
                    'orden'  => $orden
                ];
            }
        }
    }

    // Cerrar productos: prioriza tamaños de TABLA; si no hay, usa JSON de p.tamanos
    foreach ($prods as $pid => $info) {
        $sizes = $info['sizes'];

        if (empty($sizes) && !empty($info['tamanos_json'])) {
            $decoded = json_decode($info['tamanos_json'], true);
            if (is_array($decoded)) {
                foreach ($decoded as $s) {
                    if (isset($s['activo']) && (int)$s['activo'] === 0) continue;
                    $label  = (string)($s['label'] ?? $s['etiqueta'] ?? '');
                    $precio = (float)($s['precio'] ?? 0);
                    $orden  = isset($s['orden']) ? (int)$s['orden'] : 9999;
                    $key    = (string)($s['key'] ?? strtolower(preg_replace('/\s+/', '_', $label)));
                    if ($key === '') $key = 'op_'.$pid.'_'.$orden;

                    $sizes[] = ['key'=>$key,'label'=>$label,'precio'=>$precio,'orden'=>$orden];
                }
            }
        }

        // Ordenar y calcular base
        if (!empty($sizes)) {
            usort($sizes, function($a,$b){
                if ($a['orden'] === $b['orden']) return strcmp($a['label'], $b['label']);
                return $a['orden'] <=> $b['orden'];
            });
            $base = min(array_map(fn($x)=>(float)$x['precio'], $sizes));
        } else {
            $base = 0.0; // sin tamaños en tabla ni JSON
        }

        $cats[$info['cat_id']]['productos'][] = [
            'id'          => $pid,
            'nombre'      => $info['nombre'],
            'descripcion' => $info['descripcion'],
            'precio'      => (float)$base,  // usado por el front en tarjetas
            'imagen_url'  => $info['imagen_url'],
            'tamanos'     => $sizes         // usado por el front para SIZE_MAP
        ];
    }

    if ($ocultarVacias) {
        $cats = array_filter($cats, fn($c) => !empty($c['productos']));
    }

    respond(['success' => true, 'categorias' => array_values($cats)]);
}



    respond(['success' => false, 'error' => 'Acción GET no soportada'], 400);
}

/* ===========================
 * POST handlers
 * =========================== */
if ($method === 'POST') {
    $body = read_json_body();
    if (!$body)
        respond(['success' => false, 'error' => 'Body JSON inválido'], 400);
    $action = $body['action'] ?? $action;

    /* --- POST: crear_pedido ----------------------------------------------- */
    if ($action === 'crear_pedido') {
        $person_code = trim((string) ($body['person_code'] ?? ''));
        $items = $body['items'] ?? [];
        if ($person_code === '')
            respond(['success' => false, 'error' => 'person_code requerido'], 422);
        if (!is_array($items) || count($items) === 0)
            respond(['success' => false, 'error' => 'items vacío'], 422);

        $notas = trim((string) ($body['notas'] ?? ''));
        $origen = $body['origen'] ?? 'caja';
        if (!in_array($origen, ['kiosko', 'caja'], true))
            $origen = 'caja';

        $t = recalc_totales($items, $body['descuento'] ?? 0, $body['impuestos'] ?? 0, $body['propina'] ?? 0);

        try {
            $conexion->begin_transaction();

            $codigo = generar_codigo($conexion);
            $estado = 'pendiente';

            $sqlP = "INSERT INTO caf_pedidos
        (codigo, person_code, origen, estado, notas,
         subtotal, descuento, impuestos, propina, total,
         creado_en, actualizado_en, pagado_en)
        VALUES (?,?,?,?,?,
                ?,?,?,?,?,
                NOW(), NOW(), NULL)";
            $stmt = $conexion->prepare($sqlP);
            if (!$stmt)
                throw new Exception("prepare pedido: " . $conexion->error);
            // 5 strings + 5 doubles
            $stmt->bind_param(
                'sssssddddd',
                $codigo,
                $person_code,
                $origen,
                $estado,
                $notas,
                $t['subtotal'],
                $t['descuento'],
                $t['impuestos'],
                $t['propina'],
                $t['total']
            );
            if (!$stmt->execute())
                throw new Exception("insert pedido: " . $stmt->error);
            $pedido_id = $stmt->insert_id;
            $stmt->close();

            $sqlI = "INSERT INTO caf_pedidos_items
        (pedido_id, producto_id, nombre_snapshot, descripcion_snapshot,
         cantidad, precio_unit, total_linea, tamano_key, tamano_label, nota)
        VALUES (?,?,?,?,?,?,?,?,?,?)";
            $stmtI = $conexion->prepare($sqlI);
            if (!$stmtI)
                throw new Exception("prepare items: " . $conexion->error);

            foreach ($items as $it) {
                $producto_id = isset($it['producto_id']) ? (int) $it['producto_id'] : null;
                $nombre_sn = trim((string) ($it['nombre_snapshot'] ?? $it['nombre'] ?? 'Producto'));
                $desc_sn = trim((string) ($it['descripcion_snapshot'] ?? $it['descripcion'] ?? ''));
                $cantidad = max(1, (float) ($it['cantidad'] ?? 1));
                $precio_unit = (float) ($it['precio_unit'] ?? 0);
                $total_linea = (float) ($it['total_linea'] ?? ($cantidad * $precio_unit));
                $tkey = isset($it['tamano_key']) ? (string) $it['tamano_key'] : null;
                $tlabel = isset($it['tamano_label']) ? (string) $it['tamano_label'] : null;
                $nota = isset($it['nota']) ? (string) $it['nota'] : null;

                // tipos: i i s s d d d s s s
                $stmtI->bind_param(
                    'iissdddsss',
                    $pedido_id,
                    $producto_id,
                    $nombre_sn,
                    $desc_sn,
                    $cantidad,
                    $precio_unit,
                    $total_linea,
                    $tkey,
                    $tlabel,
                    $nota
                );
                if (!$stmtI->execute())
                    throw new Exception("insert item: " . $stmtI->error);
            }
            $stmtI->close();

            $conexion->commit();

            respond(['success' => true, 'pedido_id' => $pedido_id, 'codigo' => $codigo, 'totales' => $t]);
        } catch (Throwable $e) {
            if ($conexion->errno)
                $conexion->rollback();
            respond(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /* --- POST: cerrar_venta ------------------------------------------------
     * Body: {
     *   action:'cerrar_venta',
     *   pedido_id,
     *   metodo_pago: 'efectivo'|'tarjeta'|'transferencia'|'otros',
     *   pago_recibido?, referencia?,
     *   override_totales?: {descuento?,impuestos?,propina?}
     * }
     */
    if ($action === 'cerrar_venta') {
        $pedido_id = (int) ($body['pedido_id'] ?? 0);
        $metodo_pago = $body['metodo_pago'] ?? 'efectivo';
        $pago_recibido = isset($body['pago_recibido']) ? (float) $body['pago_recibido'] : null;
        $referencia = trim((string) ($body['referencia'] ?? ''));

        if ($pedido_id <= 0)
            respond(['success' => false, 'error' => 'pedido_id inválido'], 422);
        if (!in_array($metodo_pago, ['efectivo', 'tarjeta', 'transferencia', 'otros'], true)) {
            respond(['success' => false, 'error' => 'metodo_pago inválido'], 422);
        }

        [$pedido, $pitems] = obtener_pedido_y_items($conexion, $pedido_id);
        if (!$pedido)
            respond(['success' => false, 'error' => 'Pedido no encontrado'], 404);
        if ($pedido['estado'] === 'pagado')
            respond(['success' => false, 'error' => 'El pedido ya está pagado'], 409);

        // Permitir ajustar descuento/impuestos/propina al momento del cobro
        $ov = $body['override_totales'] ?? [];
        $t = recalc_totales(
            array_map(function ($it) {
                return ['cantidad' => (float) $it['cantidad'], 'precio_unit' => (float) $it['precio_unit']];
            }, $pitems),
            $ov['descuento'] ?? $pedido['descuento'],
            $ov['impuestos'] ?? $pedido['impuestos'],
            $ov['propina'] ?? $pedido['propina']
        );

        // Reglas de pago recibido/cambio
        if ($metodo_pago === 'efectivo') {
            if ($pago_recibido === null)
                respond(['success' => false, 'error' => 'pago_recibido requerido para efectivo'], 422);
            if ($pago_recibido < $t['total']) {
                respond(['success' => false, 'error' => 'pago_recibido insuficiente'], 422);
            }
        } else {
            if ($pago_recibido === null)
                $pago_recibido = $t['total'];
        }
        $cambio = max(0, (float) number_format($pago_recibido - $t['total'], 2, '.', ''));

        try {
            $conexion->begin_transaction();

            // Folio único legible
            $folio = generar_folio($conexion);

            // Inserta venta
            $sqlV = "INSERT INTO caf_ventas
        (pedido_id, person_code, folio,
         subtotal, descuento, impuestos, propina, total,
         metodo_pago, pago_recibido, cambio, referencia,
         vendido_en, actualizado_en, anulada, motivo_anulacion, anulada_en)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW(), NOW(), 0, NULL, NULL)";
            $stmtV = $conexion->prepare($sqlV);
            if (!$stmtV)
                throw new Exception("prepare venta: " . $conexion->error);
            // tipos: i s s d d d d d s d d s
            $stmtV->bind_param(
                'issdddddsdds',
                $pedido_id,
                $pedido['person_code'],
                $folio,
                $t['subtotal'],
                $t['descuento'],
                $t['impuestos'],
                $t['propina'],
                $t['total'],
                $metodo_pago,
                $pago_recibido,
                $cambio,
                $referencia
            );
            if (!$stmtV->execute())
                throw new Exception("insert venta: " . $stmtV->error);
            $venta_id = $stmtV->insert_id;
            $stmtV->close();

            // Copia items a venta_items
            $sqlVI = "INSERT INTO caf_ventas_items
        (venta_id, producto_id, nombre_snapshot, descripcion_snapshot,
         cantidad, precio_unit, total_linea)
        VALUES (?,?,?,?,?,?,?)";
            $stmtVI = $conexion->prepare($sqlVI);
            if (!$stmtVI)
                throw new Exception("prepare venta_items: " . $conexion->error);

            foreach ($pitems as $it) {
                $producto_id = isset($it['producto_id']) ? (int) $it['producto_id'] : null;
                $nombre_sn = (string) $it['nombre_snapshot'];
                $desc_sn = (string) $it['descripcion_snapshot'];
                $cantidad = (float) $it['cantidad'];
                $precio_unit = (float) $it['precio_unit'];
                $total_linea = (float) $it['total_linea'];

                // tipos: i i s s d d d
                $stmtVI->bind_param(
                    'iissddd',
                    $venta_id,
                    $producto_id,
                    $nombre_sn,
                    $desc_sn,
                    $cantidad,
                    $precio_unit,
                    $total_linea
                );
                if (!$stmtVI->execute())
                    throw new Exception("insert venta_item: " . $stmtVI->error);
            }
            $stmtVI->close();

            // Actualiza pedido a pagado
            $sqlUP = "UPDATE caf_pedidos
                SET estado='pagado',
                    subtotal=?, descuento=?, impuestos=?, propina=?, total=?,
                    pagado_en=NOW(), actualizado_en=NOW()
                WHERE id=?";
            $stmtUP = $conexion->prepare($sqlUP);
            if (!$stmtUP)
                throw new Exception("prepare update pedido: " . $conexion->error);
            $stmtUP->bind_param('dddddi', $t['subtotal'], $t['descuento'], $t['impuestos'], $t['propina'], $t['total'], $pedido_id);
            if (!$stmtUP->execute())
                throw new Exception("update pedido: " . $stmtUP->error);
            $stmtUP->close();

            $conexion->commit();

            respond([
                'success' => true,
                'venta_id' => $venta_id,
                'folio' => $folio,
                'pedido_id' => $pedido_id,
                'person_code' => $pedido['person_code'],
                'totales' => $t,
                'metodo_pago' => $metodo_pago,
                'pago_recibido' => $pago_recibido,
                'cambio' => $cambio
            ]);
        } catch (Throwable $e) {
            if ($conexion->errno)
                $conexion->rollback();
            respond(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    respond(['success' => false, 'error' => 'Acción no soportada'], 400);
}

respond(['success' => false, 'error' => 'Método/acción no soportados'], 405);
