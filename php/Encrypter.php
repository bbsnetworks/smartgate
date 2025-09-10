<?php
class Encrypter {
    public static function HikvisionSignature($secretKey, $content) {
        $hash = hash_hmac('sha256', $content, $secretKey, true);
        return base64_encode($hash);
    }
}

?>
