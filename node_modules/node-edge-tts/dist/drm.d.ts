export declare const CHROMIUM_FULL_VERSION = "143.0.3650.75";
export declare const SEC_MS_GEC_VERSION = "1-143.0.3650.75";
export declare const SEC_MS_GEC_VERSION_V2 = "2-143.0.3650.75";
export declare const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export declare function generateSecMsGecToken(): string;
/**
 * 根据 Unix 时间戳生成 Sec-MS-GEC v2 Token
 *
 * @param unixSeconds Unix 时间戳（秒）
 * @returns CS64-SHA256 格式的 Token
 */
export declare function generateSecMsGecToken_V2(unixSeconds?: number): string;
