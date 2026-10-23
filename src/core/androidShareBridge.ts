/**
 * Android WebView Share Bridge Polyfill
 * Seamlessly routes navigator.share({ files: [...] }) to native Android Intent.ACTION_SEND
 * when running inside an Android WebView with AndroidShareBridge attached.
 */

declare global {
    interface Window {
        AndroidShareBridge?: {
            postMessage: (json: string) => void;
        };
        __pendingShares?: Record<string, { resolve: () => void; reject: (err: any) => void }>;
        __shareResult?: (id: string, success: boolean, errorMessage?: string) => void;
    }
}

export function initAndroidShareBridge(): void {
    if (typeof window === 'undefined') return;

    window.__pendingShares = window.__pendingShares || {};
    window.__shareResult = function (id: string, success: boolean, errorMessage?: string) {
        const pending = window.__pendingShares?.[id];
        if (!pending) return;
        delete window.__pendingShares![id];
        if (success) {
            pending.resolve();
        } else {
            pending.reject(new Error(errorMessage || 'Share cancelled'));
        }
    };

    const hasBridge = () => typeof window.AndroidShareBridge !== 'undefined';
    const originalShare = typeof navigator !== 'undefined' && navigator.share ? navigator.share.bind(navigator) : null;
    const originalCanShare = typeof navigator !== 'undefined' && navigator.canShare ? navigator.canShare.bind(navigator) : null;

    if (typeof navigator !== 'undefined') {
        navigator.canShare = function (data?: ShareData): boolean {
            if (hasBridge()) {
                return !!(data && (Boolean(data.files && data.files.length) || data.title || data.text || data.url));
            }
            if (originalCanShare) {
                return originalCanShare(data);
            }
            return !!(data && (data.title || data.text || data.url));
        };

        navigator.share = async function (data?: ShareData): Promise<void> {
            // When running in Android WebView with the bridge and files are present, delegate to native Intent
            if (hasBridge() && (data?.files?.length || data?.text || data?.title)) {
                return new Promise<void>((resolve, reject) => {
                    const shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                    window.__pendingShares![shareId] = { resolve, reject };

                    const filePromises = (data?.files || []).map((file) => {
                        return new Promise<{ name: string; type: string; base64: string }>((res, rej) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const result = reader.result as string;
                                const base64 = result.includes(',') ? result.split(',')[1] : result;
                                res({
                                    name: file.name,
                                    type: file.type || 'image/png',
                                    base64: base64
                                });
                            };
                            reader.onerror = rej;
                            reader.readAsDataURL(file);
                        });
                    });

                    Promise.all(filePromises)
                        .then((files) => {
                            try {
                                window.AndroidShareBridge!.postMessage(
                                    JSON.stringify({
                                        id: shareId,
                                        title: data?.title || '',
                                        text: data?.text || '',
                                        files: files
                                    })
                                );
                            } catch (postErr) {
                                delete window.__pendingShares![shareId];
                                reject(postErr);
                            }
                        })
                        .catch((err) => {
                            delete window.__pendingShares![shareId];
                            reject(err);
                        });
                });
            }

            // Normal browser fallback
            if (originalShare) {
                return originalShare(data);
            }

            throw new Error('Web Share API is not supported in this environment');
        };
    }
}

// Auto-initialize immediately
initAndroidShareBridge();
