<?php

require 'conexion.php';

header('Content-Type: application/json; charset=utf-8');

$usuario = $_GET['usuario'] ?? null;
$tipo    = $_GET['tipo'] ?? null;
$fecha   = $_GET['fecha'] ?? null;
$inicio  = $_GET['inicio'] ?? null;
$fin     = $_GET['fin'] ?? null;

if (!$usuario || !$tipo) {
    echo json_encode([
        "success" => false,
        "error"   => "Faltan parámetros"
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| Determinar rango de fechas
|--------------------------------------------------------------------------
*/

switch ($tipo) {
    case 'dia':
        if (!$fecha) {
            echo json_encode([
                "success" => false,
                "error"   => "Falta la fecha del reporte"
            ]);
            exit;
        }

        $inicio = $fecha;
        $fin    = $fecha;
        break;

    case 'mes':
        if (!$fecha) {
            echo json_encode([
                "success" => false,
                "error"   => "Falta el mes del reporte"
            ]);
            exit;
        }

        $inicio = date("Y-m-01", strtotime($fecha));
        $fin    = date("Y-m-t", strtotime($fecha));
        break;

    case 'anio':
        if (!$fecha) {
            echo json_encode([
                "success" => false,
                "error"   => "Falta el año del reporte"
            ]);
            exit;
        }

        $inicio = "{$fecha}-01-01";
        $fin    = "{$fecha}-12-31";
        break;

    case 'rango':
        if (!$inicio || !$fin) {
            echo json_encode([
                "success" => false,
                "error"   => "Faltan fechas para el rango"
            ]);
            exit;
        }

        if ($inicio > $fin) {
            echo json_encode([
                "success" => false,
                "error"   => "La fecha inicial no puede ser mayor a la fecha final"
            ]);
            exit;
        }
        break;

    default:
        echo json_encode([
            "success" => false,
            "error"   => "Tipo de búsqueda no válido"
        ]);
        exit;
}

try {

    /*
    |--------------------------------------------------------------------------
    | 1. Pagos de suscripciones
    |--------------------------------------------------------------------------
    */

    if ($usuario !== "todos") {
        $stmt = $conexion->prepare("
            SELECT
                COALESCE(SUM(monto - IFNULL(descuento, 0)), 0) AS total,
                COUNT(*) AS cantidad
            FROM pagos
            WHERE usuario_id = ?
              AND DATE(fecha_pago) BETWEEN ? AND ?
        ");

        $stmt->bind_param("iss", $usuario, $inicio, $fin);
    } else {
        $stmt = $conexion->prepare("
            SELECT
                COALESCE(SUM(monto - IFNULL(descuento, 0)), 0) AS total,
                COUNT(*) AS cantidad
            FROM pagos
            WHERE DATE(fecha_pago) BETWEEN ? AND ?
        ");

        $stmt->bind_param("ss", $inicio, $fin);
    }

    $stmt->execute();
    $stmt->bind_result($total_pagos, $cantidad_pagos);
    $stmt->fetch();
    $stmt->close();

    /*
    |--------------------------------------------------------------------------
    | 2. Desglose de pagos por tarifa y método de pago
    |--------------------------------------------------------------------------
    |
    | El monto cobrado se calcula como:
    |
    | monto - descuento
    |
    | También se incluye una agrupación para pagos que no tengan tarifa_id.
    |--------------------------------------------------------------------------
    */

    $resumen_tarifas = [];

    if ($usuario !== "todos") {
        $stmtTarifas = $conexion->prepare("
            SELECT
                p.tarifa_id,

                COALESCE(
                    t.nombre,
                    CASE
                        WHEN p.tarifa_id IS NULL THEN 'Sin tarifa asignada'
                        ELSE CONCAT('Tarifa eliminada #', p.tarifa_id)
                    END
                ) AS tarifa_nombre,

                t.monto AS monto_tarifa,

                COUNT(*) AS cantidad_pagos,

                COALESCE(
                    SUM(p.monto - IFNULL(p.descuento, 0)),
                    0
                ) AS total_tarifa,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'efectivo'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_efectivo,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'efectivo'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_efectivo,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'tarjeta'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_tarjeta,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'tarjeta'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_tarjeta,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'transferencia'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_transferencia,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'transferencia'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_transferencia,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) NOT IN (
                            'efectivo',
                            'tarjeta',
                            'transferencia'
                        )
                        OR p.metodo_pago IS NULL
                        OR TRIM(p.metodo_pago) = ''
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_otro,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) NOT IN (
                                'efectivo',
                                'tarjeta',
                                'transferencia'
                            )
                            OR p.metodo_pago IS NULL
                            OR TRIM(p.metodo_pago) = ''
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_otro

            FROM pagos p

            LEFT JOIN tarifas t
                ON t.id = p.tarifa_id

            WHERE p.usuario_id = ?
              AND DATE(p.fecha_pago) BETWEEN ? AND ?

            GROUP BY
                p.tarifa_id,
                t.nombre,
                t.monto

            ORDER BY
                tarifa_nombre ASC
        ");

        $stmtTarifas->bind_param(
            "iss",
            $usuario,
            $inicio,
            $fin
        );
    } else {
        $stmtTarifas = $conexion->prepare("
            SELECT
                p.tarifa_id,

                COALESCE(
                    t.nombre,
                    CASE
                        WHEN p.tarifa_id IS NULL THEN 'Sin tarifa asignada'
                        ELSE CONCAT('Tarifa eliminada #', p.tarifa_id)
                    END
                ) AS tarifa_nombre,

                t.monto AS monto_tarifa,

                COUNT(*) AS cantidad_pagos,

                COALESCE(
                    SUM(p.monto - IFNULL(p.descuento, 0)),
                    0
                ) AS total_tarifa,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'efectivo'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_efectivo,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'efectivo'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_efectivo,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'tarjeta'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_tarjeta,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'tarjeta'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_tarjeta,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) = 'transferencia'
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_transferencia,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) = 'transferencia'
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_transferencia,

                SUM(
                    CASE
                        WHEN LOWER(TRIM(p.metodo_pago)) NOT IN (
                            'efectivo',
                            'tarjeta',
                            'transferencia'
                        )
                        OR p.metodo_pago IS NULL
                        OR TRIM(p.metodo_pago) = ''
                        THEN 1
                        ELSE 0
                    END
                ) AS cantidad_otro,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(TRIM(p.metodo_pago)) NOT IN (
                                'efectivo',
                                'tarjeta',
                                'transferencia'
                            )
                            OR p.metodo_pago IS NULL
                            OR TRIM(p.metodo_pago) = ''
                            THEN p.monto - IFNULL(p.descuento, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_otro

            FROM pagos p

            LEFT JOIN tarifas t
                ON t.id = p.tarifa_id

            WHERE DATE(p.fecha_pago) BETWEEN ? AND ?

            GROUP BY
                p.tarifa_id,
                t.nombre,
                t.monto

            ORDER BY
                tarifa_nombre ASC
        ");

        $stmtTarifas->bind_param(
            "ss",
            $inicio,
            $fin
        );
    }

    $stmtTarifas->execute();

    $resultadoTarifas = $stmtTarifas->get_result();

    while ($tarifa = $resultadoTarifas->fetch_assoc()) {
        $resumen_tarifas[] = [
            "tarifa_id" => $tarifa["tarifa_id"] !== null
                ? (int)$tarifa["tarifa_id"]
                : null,

            "nombre" => $tarifa["tarifa_nombre"],

            "monto_tarifa" => $tarifa["monto_tarifa"] !== null
                ? (float)$tarifa["monto_tarifa"]
                : null,

            "cantidad_pagos" => (int)$tarifa["cantidad_pagos"],
            "total"          => (float)$tarifa["total_tarifa"],

            "efectivo" => [
                "cantidad" => (int)$tarifa["cantidad_efectivo"],
                "total"    => (float)$tarifa["total_efectivo"]
            ],

            "tarjeta" => [
                "cantidad" => (int)$tarifa["cantidad_tarjeta"],
                "total"    => (float)$tarifa["total_tarjeta"]
            ],

            "transferencia" => [
                "cantidad" => (int)$tarifa["cantidad_transferencia"],
                "total"    => (float)$tarifa["total_transferencia"]
            ],

            "otro" => [
                "cantidad" => (int)$tarifa["cantidad_otro"],
                "total"    => (float)$tarifa["total_otro"]
            ]
        ];
    }

    $stmtTarifas->close();

    /*
    |--------------------------------------------------------------------------
    | 3. Pagos de productos, excluyendo visitas con código 1
    |--------------------------------------------------------------------------
    */

    if ($usuario !== "todos") {
        $stmt2 = $conexion->prepare("
            SELECT
                COALESCE(SUM(pp.total), 0) AS total,
                COUNT(DISTINCT pp.venta_id) AS cantidad
            FROM pagos_productos pp

            INNER JOIN productos pr
                ON pr.id = pp.producto_id

            WHERE pp.usuario_id = ?
              AND DATE(pp.fecha_pago) BETWEEN ? AND ?
              AND pr.codigo <> '1'
        ");

        $stmt2->bind_param("iss", $usuario, $inicio, $fin);
    } else {
        $stmt2 = $conexion->prepare("
            SELECT
                COALESCE(SUM(pp.total), 0) AS total,
                COUNT(DISTINCT pp.venta_id) AS cantidad
            FROM pagos_productos pp

            INNER JOIN productos pr
                ON pr.id = pp.producto_id

            WHERE DATE(pp.fecha_pago) BETWEEN ? AND ?
              AND pr.codigo <> '1'
        ");

        $stmt2->bind_param("ss", $inicio, $fin);
    }

    $stmt2->execute();
    $stmt2->bind_result($total_productos, $cantidad_productos);
    $stmt2->fetch();
    $stmt2->close();

    /*
    |--------------------------------------------------------------------------
    | 4. Visitas, producto con código 1
    |--------------------------------------------------------------------------
    */

    if ($usuario !== "todos") {
        $stmtV = $conexion->prepare("
            SELECT
                COALESCE(SUM(pp.cantidad), 0) AS visitas_cantidad,
                COALESCE(SUM(pp.total), 0) AS visitas_total
            FROM pagos_productos pp

            INNER JOIN productos pr
                ON pr.id = pp.producto_id

            WHERE pp.usuario_id = ?
              AND DATE(pp.fecha_pago) BETWEEN ? AND ?
              AND pr.codigo = '1'
        ");

        $stmtV->bind_param("iss", $usuario, $inicio, $fin);
    } else {
        $stmtV = $conexion->prepare("
            SELECT
                COALESCE(SUM(pp.cantidad), 0) AS visitas_cantidad,
                COALESCE(SUM(pp.total), 0) AS visitas_total
            FROM pagos_productos pp

            INNER JOIN productos pr
                ON pr.id = pp.producto_id

            WHERE DATE(pp.fecha_pago) BETWEEN ? AND ?
              AND pr.codigo = '1'
        ");

        $stmtV->bind_param("ss", $inicio, $fin);
    }

    $stmtV->execute();
    $stmtV->bind_result($visitas_cantidad, $visitas_total);
    $stmtV->fetch();
    $stmtV->close();

    /*
    |--------------------------------------------------------------------------
    | 5. Pagos financiados
    |--------------------------------------------------------------------------
    */

    if ($usuario !== "todos") {
        $stmtF = $conexion->prepare("
            SELECT
                COALESCE(SUM(vfp.monto), 0) AS total_financiados,
                COUNT(*) AS cantidad_financiados
            FROM ventas_financiadas_pagos vfp

            WHERE vfp.recibido_por = ?
              AND DATE(vfp.fecha_pago) BETWEEN ? AND ?
        ");

        $stmtF->bind_param("iss", $usuario, $inicio, $fin);
    } else {
        $stmtF = $conexion->prepare("
            SELECT
                COALESCE(SUM(vfp.monto), 0) AS total_financiados,
                COUNT(*) AS cantidad_financiados
            FROM ventas_financiadas_pagos vfp

            WHERE DATE(vfp.fecha_pago) BETWEEN ? AND ?
        ");

        $stmtF->bind_param("ss", $inicio, $fin);
    }

    $stmtF->execute();
    $stmtF->bind_result($total_financiados, $cantidad_financiados);
    $stmtF->fetch();
    $stmtF->close();

    /*
    |--------------------------------------------------------------------------
    | 6. Movimientos de caja
    |--------------------------------------------------------------------------
    */

    if ($usuario !== "todos") {
        $stmt3 = $conexion->prepare("
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo = 'INGRESO' THEN monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS ingresos,

                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo = 'EGRESO' THEN monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS egresos,

                COUNT(*) AS cantidad

            FROM caja_movimientos

            WHERE usuario_id = ?
              AND DATE(fecha) BETWEEN ? AND ?
        ");

        $stmt3->bind_param("iss", $usuario, $inicio, $fin);
    } else {
        $stmt3 = $conexion->prepare("
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo = 'INGRESO' THEN monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS ingresos,

                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo = 'EGRESO' THEN monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS egresos,

                COUNT(*) AS cantidad

            FROM caja_movimientos

            WHERE DATE(fecha) BETWEEN ? AND ?
        ");

        $stmt3->bind_param("ss", $inicio, $fin);
    }

    $stmt3->execute();
    $stmt3->bind_result(
        $caja_ingresos,
        $caja_egresos,
        $caja_cantidad
    );
    $stmt3->fetch();
    $stmt3->close();

    /*
    |--------------------------------------------------------------------------
    | 7. Respuesta final
    |--------------------------------------------------------------------------
    */

    $total_pagos       = (float)($total_pagos ?? 0);
    $total_productos   = (float)($total_productos ?? 0);
    $visitas_total     = (float)($visitas_total ?? 0);
    $total_financiados = (float)($total_financiados ?? 0);

    $total_general =
        $total_pagos +
        $total_productos +
        $visitas_total +
        $total_financiados;

    echo json_encode([
        "success" => true,

        "fecha_inicio" => $inicio,
        "fecha_fin"    => $fin,

        "total_pagos"    => $total_pagos,
        "cantidad_pagos" => (int)($cantidad_pagos ?? 0),

        /*
        | Nueva información para la card.
        */
        "resumen_tarifas" => $resumen_tarifas,

        "total_productos"    => $total_productos,
        "cantidad_productos" => (int)($cantidad_productos ?? 0),

        "total_financiados"    => $total_financiados,
        "cantidad_financiados" => (int)($cantidad_financiados ?? 0),

        "visitas_cantidad" => (int)($visitas_cantidad ?? 0),
        "visitas_total"    => $visitas_total,

        "caja_ingresos" => (float)($caja_ingresos ?? 0),
        "caja_egresos"  => (float)($caja_egresos ?? 0),
        "caja_cantidad" => (int)($caja_cantidad ?? 0),

        "total_general" => $total_general
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error"   => "Error al consultar: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

