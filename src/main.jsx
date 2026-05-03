import React from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import * as AmbientDreamUtils from './ambient-dream-utils';
import { buildMusicUrlCandidates } from './music-url.mjs';
import { putMusicBlob, getMusicBlob, deleteMusicBlob } from './music-blob-store.mjs';
import { serializeTracksForStorage } from './music-track-storage.mjs';
import { tracksFromManifest } from './music-library.mjs';
import { useMusicAutoplay } from './music-autoplay.mjs';

gsap.registerPlugin(Draggable);
window.AmbientDreamUtils = AmbientDreamUtils;

// 注册 GSAP 插件

        // 默认文本数据
        const DEFAULT_COMMENTS = [
            "黑板上的粉笔灰落在阳光里 像一场无声的雪",
            "大海是鱼儿的陆地 梦境是爱情的白天",
            "那些没说出口的喜欢 都化作了教室窗外 迟迟不肯落下的晚霞",
            "就算是在梦里 就算是宇宙深处 那份爱也永远的留在我心底",
            "耳机分你一半的旋律里 藏着一整个夏天的欲言又止",
            "纸飞机划过半空 载着不敢投递的信 最终停在了时光的折痕里"
        ];

        const THEMES = ['theme-glass', 'theme-abyss', 'theme-crimson', 'theme-holo', 'theme-paper', 'theme-neon', 'theme-blush', 'theme-lavender', 'theme-pearl', 'theme-sunset'];
        const FONT_PRESETS = ['font-serif', 'font-kaiti', 'font-fangsong', 'font-sans', 'font-rounded'];
        const TAG_COLORS = ['#a895b8', '#98aebb', '#8fa58f', '#7f809a', '#c8a7a7', '#b1c6b1', '#d0c3a8', '#9fb6c4'];
        const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
        const AUTO_READ_INTERVAL_MS = 5600;

        const getSeasonByNoteCount = (count) => {
            if (!Number.isFinite(count) || count <= 5) return null;
            const idx = Math.floor((count - 6) / 8) % 4;
            return SEASONS[(idx + 4) % 4];
        };

        const createRng = (seed) => {
            let s = (seed >>> 0) || 1;
            return () => {
                s = (s * 1664525 + 1013904223) >>> 0;
                return s / 4294967296;
            };
        };

        const spawnSeasonParticle = (season, rng, w, h) => {
            if (!season) return null;
            if (season === 'winter') {
                const fog = rng() < 0.78;
                if (fog) {
                    const edge = rng() < 0.5;
                    const x = edge ? (rng() < 0.5 ? -60 - rng() * 120 : w + 60 + rng() * 120) : rng() * w;
                    const y = 24 + rng() * (h * 0.80);
                    return {
                        kind: 'fog',
                        x,
                        y,
                        vx: (rng() - 0.5) * 0.10,
                        vy: 0.03 + rng() * 0.06,
                        rot: 0,
                        vr: 0,
                        size: 34 + rng() * 88,
                        alpha: 0.030 + rng() * 0.060,
                        tw: rng(),
                        seed: rng()
                    };
                }
                const x = rng() * w;
                const y = -30 - rng() * 50;
                return {
                    kind: 'snow',
                    x,
                    y,
                    vx: (rng() - 0.5) * 0.10,
                    vy: 0.16 + rng() * 0.44,
                    rot: 0,
                    vr: 0,
                    size: 0.7 + rng() * 1.8,
                    alpha: 0.06 + rng() * 0.14,
                    tw: rng()
                };
            }

            if (season === 'summer') {
                const x = rng() * w;
                const y = rng() * h;
                return {
                    kind: 'firefly',
                    x,
                    y,
                    vx: (rng() - 0.5) * 0.16,
                    vy: (rng() - 0.5) * 0.12,
                    rot: 0,
                    vr: 0,
                    size: 1.2 + rng() * 2.6,
                    alpha: 0.10 + rng() * 0.22,
                    tw: rng(),
                    seed: rng()
                };
            }

            if (season === 'autumn') {
                const x = rng() * w;
                const y = -30 - rng() * 60;
                return {
                    kind: 'leaf',
                    x,
                    y,
                    vx: (rng() - 0.5) * 0.22,
                    vy: 0.26 + rng() * 0.64,
                    rot: (rng() - 0.5) * 1.6,
                    vr: (rng() - 0.5) * 0.010,
                    size: 9 + rng() * 16,
                    alpha: 0.14 + rng() * 0.26,
                    tw: rng(),
                    seed: rng()
                };
            }

            const x = rng() * w;
            const y = -30 - rng() * 60;
            return {
                kind: 'petal',
                x,
                y,
                vx: (rng() - 0.5) * 0.22,
                vy: 0.14 + rng() * 0.46,
                rot: (rng() - 0.5) * 1.4,
                vr: (rng() - 0.5) * 0.014,
                size: 10 + rng() * 18,
                alpha: 0.20 + rng() * 0.30,
                tw: rng(),
                seed: rng()
            };
        };

        const stepSeasonParticle = (season, p, dt, t, w, h) => {
            const k = (dt / 16.67) * 10;
            if (p.kind === 'firefly') {
                const s = t * 0.0013 + p.tw * Math.PI * 2;
                const ax = Math.cos(s) * 0.22 + Math.sin(s * 1.7) * 0.12;
                const ay = Math.sin(s * 1.3) * 0.18 + Math.cos(s * 0.9) * 0.08;
                p.x += (p.vx + ax) * k;
                p.y += (p.vy + ay) * k;
                if (p.x < -60) p.x = w + 40;
                if (p.x > w + 60) p.x = -40;
                if (p.y < -60) p.y = h + 40;
                if (p.y > h + 60) p.y = -40;
                return true;
            }
            if (p.kind === 'fog') {
                const s = t * 0.0007 + (p.seed || 0) * 10;
                p.x += (p.vx + Math.cos(s) * 0.10) * k;
                p.y += (p.vy + Math.sin(s * 0.7) * 0.02) * k;
                if (p.x < -180) p.x = w + 160;
                if (p.x > w + 180) p.x = -160;
                if (p.y < -80) p.y = h + 60;
                if (p.y > h + 80) p.y = -60;
                return true;
            }
            if (p.kind === 'snow') {
                const drift = Math.sin(t * 0.0011 + p.tw * Math.PI * 2) * 0.10;
                p.x += (p.vx + drift) * k;
                p.y += p.vy * k;
                if (p.y > h + 30 || p.x < -80 || p.x > w + 80) return false;
                return true;
            }
            if (p.kind === 'leaf') {
                const drift = Math.sin(t * 0.0010 + p.tw * Math.PI * 2) * 0.18;
                p.x += (p.vx + drift) * k;
                p.y += p.vy * k;
                p.rot += (p.vr + Math.sin(t * 0.0016 + p.tw * 8) * 0.002) * k;
                if (p.y > h + 30 || p.x < -100 || p.x > w + 100) return false;
                return true;
            }
            const drift = Math.sin(t * 0.0012 + p.tw * Math.PI * 2) * 0.14;
            p.x += (p.vx + drift) * k;
            p.y += p.vy * k;
            p.rot += p.vr * k;
            if (p.y > h + 30 || p.x < -90 || p.x > w + 90) return false;
            return true;
        };

        const drawSeasonParticle = (ctx, season, p, t, fade = 1) => {
            if (!p) return;
            if (p.kind === 'firefly') {
                const f = 0.55 + 0.45 * Math.sin(t * 0.010 + p.tw * Math.PI * 2);
                const a = p.alpha * (0.35 + f) * fade;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.fillStyle = 'rgba(250,244,238,0.96)';
                ctx.shadowColor = 'rgba(250,244,238,0.70)';
                ctx.shadowBlur = 10 + 18 * f;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.9 + 0.35 * f), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            }
            if (p.kind === 'fog') {
                const drift = 0.65 + 0.35 * Math.sin(t * 0.0010 + p.tw * Math.PI * 2);
                ctx.save();
                ctx.globalAlpha = p.alpha * drift * fade;
                ctx.fillStyle = 'rgba(210, 224, 235, 0.28)';
                ctx.shadowColor = 'rgba(152,174,187,0.32)';
                ctx.shadowBlur = 34 + 34 * drift;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.seed || 0) * 0.4);
                ctx.scale(1.55 + 0.25 * drift, 1);
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            }
            if (p.kind === 'snow') {
                ctx.save();
                ctx.globalAlpha = p.alpha * fade;
                ctx.fillStyle = 'rgba(250,244,238,0.78)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            }
            if (p.kind === 'leaf') {
                ctx.save();
                ctx.globalAlpha = p.alpha * fade;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = 'rgba(216, 196, 146, 0.82)';
                ctx.beginPath();
                ctx.moveTo(0, -p.size * 0.52);
                ctx.quadraticCurveTo(p.size * 0.55, -p.size * 0.12, 0, p.size * 0.62);
                ctx.quadraticCurveTo(-p.size * 0.52, -p.size * 0.18, 0, -p.size * 0.52);
                ctx.fill();
                ctx.strokeStyle = 'rgba(120, 92, 64, 0.18)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -p.size * 0.44);
                ctx.lineTo(0, p.size * 0.46);
                ctx.stroke();
                ctx.restore();
                return;
            }
            const flip = 0.50 + 0.50 * Math.sin(t * 0.0036 + p.tw * Math.PI * 2);
            const a = p.alpha * (0.70 + 0.30 * flip) * fade;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = 'rgba(234, 214, 242, 0.82)';
            ctx.beginPath();
            const w = p.size * (0.44 + 0.34 * flip);
            const h = p.size * 0.62;
            ctx.moveTo(0, -h);
            ctx.quadraticCurveTo(w, -h * 0.15, 0, h);
            ctx.quadraticCurveTo(-w, -h * 0.10, 0, -h);
            ctx.fill();
            ctx.restore();
        };

        const spawnRipple = (season, x, y, t) => ({ season, x, y, t0: t, dur: 1400, seed: Math.random() });

        const drawRipple = (ctx, r, t) => {
            const p = Math.max(0, Math.min(1, (t - r.t0) / r.dur));
            const a = (1 - p) * 0.42;
            const radius = 18 + p * 120;
            ctx.save();
            ctx.globalAlpha = a;
            if (r.season === 'summer') {
                ctx.strokeStyle = 'rgba(250,244,238,0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (r.season === 'winter') {
                ctx.strokeStyle = 'rgba(152,174,187,0.55)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const steps = 32;
                for (let i = 0; i <= steps; i++) {
                    const ang = (i / steps) * Math.PI * 2;
                    const jitter = 1 + 0.08 * Math.sin(ang * 6 + r.seed * 10);
                    const rr = radius * jitter;
                    const px = r.x + Math.cos(ang) * rr;
                    const py = r.y + Math.sin(ang) * rr;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            } else if (r.season === 'autumn') {
                ctx.strokeStyle = 'rgba(208,195,168,0.55)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius * 1.05, radius * 0.72, p * 2.4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(168,149,184,0.55)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, radius * 1.08, radius * 0.78, p * 2.0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            return p < 1;
        };
        const STORAGE_KEYS = {
            favorites: 'ambient-dream-favorites',
            tracks: 'ambient-dream-tracks',
            currentTrackIndex: 'ambient-dream-current-track-index',
            orderMode: 'ambient-dream-order-mode',
            volume: 'ambient-dream-volume',
            comments: 'ambient-dream-comments',
            currentIndex: 'ambient-dream-current-index',
            notes: 'ambient-dream-notes',
            arrange: 'ambient-dream-arrange',
            mode: 'ambient-dream-mode',
            tagPalette: 'ambient-dream-tags-palette',
            directoryViewMode: 'ambient-dream-directory-view-mode',
            appBackupVersion: 'ambient-dream-backup-version',
            uiProfile: 'ambient-dream-ui-profile',
            mobileOnboarding: 'ambient-dream-mobile-onboarding-v1'
        };

        const safeReadStorage = (key, fallback) => {
            try {
                const raw = window.localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (error) {
                return fallback;
            }
        };

        const safeWriteStorage = (key, value) => {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                return false;
            }
        };

        const getRandomNotePos = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const noteWidth = width < 820 ? Math.min(220, width * 0.62) : 320;
            const noteHeight = width < 820 ? 150 : 200;
            const xPadding = width < 820 ? 12 : 20;
            const yPaddingTop = width < 820 ? 160 : 20;
            const yPaddingBottom = width < 820 ? 160 : 24;
            return {
                x: Math.max(xPadding, Math.random() * Math.max(40, width - noteWidth - xPadding * 2) + xPadding),
                y: Math.max(yPaddingTop, Math.random() * Math.max(40, height - noteHeight - yPaddingTop - yPaddingBottom) + yPaddingTop),
                rot: (Math.random() - 0.5) * (width < 820 ? 18 : 40)
            };
        };

        const getViewportProfile = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const ratio = height / Math.max(width, 1);
            if (width <= 820 && ratio >= 1.12) {
                return { mode: 'mobile-portrait', width, height, ratio };
            }
            if (width <= 980 || height <= 640) {
                return { mode: 'compact', width, height, ratio };
            }
            return { mode: 'desktop', width, height, ratio };
        };

        const formatTime = (seconds) => {
            if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
            const total = Math.floor(seconds);
            const mm = String(Math.floor(total / 60)).padStart(2, '0');
            const ss = String(total % 60).padStart(2, '0');
            return `${mm}:${ss}`;
        };

        const normalizeTagName = (name) => String(name || '').trim();

        const pickTagColor = (name) => {
            const text = String(name || '');
            let h = 0;
            for (let i = 0; i < text.length; i++) h = (h + text.charCodeAt(i) * (i + 1)) % 997;
            return TAG_COLORS[h % TAG_COLORS.length];
        };

        // --- 组件：流体背景 ---
        const AmbientBackground = ({ bgRef }) => {
            const containerRef = React.useRef(null);

            React.useEffect(() => {
                const blobs = containerRef.current.querySelectorAll('.blob');
                
                // 给每个blob创建一个随机漂移的动画
                blobs.forEach(blob => {
                    gsap.to(blob, {
                        x: () => Math.random() * window.innerWidth * 0.5 - window.innerWidth * 0.25,
                        y: () => Math.random() * window.innerHeight * 0.5 - window.innerHeight * 0.25,
                        duration: () => 10 + Math.random() * 20,
                        ease: "sine.inOut",
                        repeat: -1,
                        yoyo: true,
                        rotation: () => Math.random() * 360
                    });
                });
            }, []);

            return (
                <div className="ambient-bg" ref={(node) => {
                    containerRef.current = node;
                    if (bgRef) bgRef.current = node;
                }}>
                    <div className="blob" style={{width: '60vw', height: '60vw', background: '#807d96', top: '-10%', left: '-10%'}}></div>
                    <div className="blob" style={{width: '50vw', height: '50vw', background: '#a992ab', bottom: '-10%', right: '-10%'}}></div>
                    <div className="blob" style={{width: '40vw', height: '40vw', background: '#95adb8', top: '20%', left: '40%'}}></div>
                    <div className="blob" style={{width: '70vw', height: '70vw', background: '#5b625f', bottom: '10%', left: '-20%'}}></div>
                </div>
            );
        };

        // --- 组件：独立的便签 ---
        const MemoryNote = ({ id, text, theme, fontClass, tags, initialPos, isFocused, onFocus, onMoveEnd }) => {
            const noteRef = React.useRef(null);
            const hasEnteredRef = React.useRef(false);
            const longPressTimerRef = React.useRef(null);
            const isFocusedRef = React.useRef(!!isFocused);
            const onMoveEndRef = React.useRef(onMoveEnd);
            const onFocusRef = React.useRef(onFocus);

            React.useEffect(() => {
                isFocusedRef.current = !!isFocused;
            }, [isFocused]);

            React.useEffect(() => {
                onMoveEndRef.current = onMoveEnd;
            }, [onMoveEnd]);

            React.useEffect(() => {
                onFocusRef.current = onFocus;
            }, [onFocus]);

            React.useEffect(() => {
                const el = noteRef.current;
                // 初始化拖拽
                Draggable.create(el, {
                    type: "x,y",
                    inertia: true, // 如果有插件的话，没有也会降级
                    onPress: function() {
                        // 拖拽时：停止随机漂移，置顶，变清晰，放大
                        gsap.killTweensOf(el);
                        gsap.to(el, {
                            scale: 1.06,
                            opacity: 1,
                            filter: 'blur(0px)',
                            zIndex: 1000,
                            duration: 0.3
                        });
                    },
                    onRelease: function() {
                        const x = Number(gsap.getProperty(el, 'x')) || 0;
                        const y = Number(gsap.getProperty(el, 'y')) || 0;
                        const rot = Number(gsap.getProperty(el, 'rotation')) || 0;
                        onMoveEndRef.current?.(id, { x, y, rot });
                        // 松开时：恢复背景状态，但保留当前位置
                        if (isFocusedRef.current) {
                            gsap.to(el, {
                                scale: 1.06,
                                opacity: 0.96,
                                filter: 'blur(0px)',
                                zIndex: 950,
                                duration: 0.5
                            });
                            return;
                        }
                        gsap.to(el, {
                            scale: 1,
                            opacity: 0.3, // 比初始稍亮一点代表被触碰过
                            filter: 'blur(1px)',
                            zIndex: 20,
                            duration: 0.8
                        });
                    }
                });

                // Hover 交互
                const onMouseEnter = () => {
                    if (Draggable.get(el) && Draggable.get(el).isDragging) return;
                    gsap.to(el, {
                        scale: isFocused ? 1.05 : 1.03,
                        opacity: isFocused ? 1 : 0.9,
                        filter: 'blur(0px)',
                        zIndex: isFocused ? 950 : 100,
                        duration: 0.4,
                        ease: "power2.out"
                    });
                };
                
                const onMouseLeave = () => {
                    if (Draggable.get(el) && Draggable.get(el).isDragging) return;
                    if (isFocused) {
                        gsap.to(el, {
                            scale: 1.04,
                            opacity: 0.96,
                            filter: 'blur(0px)',
                            zIndex: 950,
                            duration: 0.5,
                            ease: "power2.inOut"
                        });
                        return;
                    }
                    gsap.to(el, {
                        scale: 1,
                        opacity: 0.2,
                        filter: 'blur(2px)',
                        zIndex: 20,
                        duration: 0.8,
                        ease: "power2.inOut"
                    });
                };
                const onDoubleClick = () => onFocusRef.current?.(id);
                const clearLongPress = () => {
                    if (longPressTimerRef.current) {
                        window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                };
                const onTouchStart = () => {
                    clearLongPress();
                    longPressTimerRef.current = window.setTimeout(() => {
                        onFocusRef.current?.(id);
                    }, 420);
                };
                const onTouchEnd = () => clearLongPress();
                const onTouchMove = () => clearLongPress();

                el.addEventListener('mouseenter', onMouseEnter);
                el.addEventListener('mouseleave', onMouseLeave);
                el.addEventListener('dblclick', onDoubleClick);
                el.addEventListener('touchstart', onTouchStart, { passive: true });
                el.addEventListener('touchend', onTouchEnd, { passive: true });
                el.addEventListener('touchmove', onTouchMove, { passive: true });

                return () => {
                    clearLongPress();
                    el.removeEventListener('mouseenter', onMouseEnter);
                    el.removeEventListener('mouseleave', onMouseLeave);
                    el.removeEventListener('dblclick', onDoubleClick);
                    el.removeEventListener('touchstart', onTouchStart);
                    el.removeEventListener('touchend', onTouchEnd);
                    el.removeEventListener('touchmove', onTouchMove);
                    const d = Draggable.get(el);
                    if (d) d.kill();
                };
            }, [id]);

            React.useEffect(() => {
                const el = noteRef.current;
                if (!el) return;
                if (!hasEnteredRef.current) {
                    hasEnteredRef.current = true;
                    gsap.fromTo(el,
                        {
                            x: window.innerWidth / 2 - 150,
                            y: window.innerHeight / 2 - 50,
                            scale: 1.15,
                            opacity: 1,
                            rotation: 0,
                            filter: 'blur(0px)'
                        },
                        {
                            x: initialPos.x,
                            y: initialPos.y,
                            scale: 1,
                            opacity: 0.2,
                            rotation: initialPos.rot,
                            filter: 'blur(2px)',
                            duration: 1.9,
                            ease: "power3.out"
                        }
                    );
                    return;
                }

                gsap.to(el, {
                    x: initialPos.x,
                    y: initialPos.y,
                    rotation: initialPos.rot,
                    duration: 0.85,
                    ease: "power2.out"
                });
            }, [initialPos]);

            React.useEffect(() => {
                const el = noteRef.current;
                if (!el) return;
                if (isFocused) {
                    gsap.killTweensOf(el);
                    gsap.to(el, {
                        scale: 1.04,
                        opacity: 0.96,
                        filter: 'blur(0px)',
                        zIndex: 950,
                        duration: 0.6,
                        ease: "power2.out"
                    });
                } else {
                    gsap.to(el, {
                        scale: 1,
                        opacity: 0.24,
                        filter: 'blur(2px)',
                        zIndex: 20,
                        duration: 0.8,
                        ease: "power2.out"
                    });
                }
            }, [isFocused]);

            return (
                <div ref={noteRef} className={`memory-note ${theme} ${fontClass || 'font-serif'} ${isFocused ? 'focused' : ''}`} title="双击或长按置顶这一句">
                    {!!tags?.length && (
                        <div className="note-tags">
                            {tags.map((t) => (
                                <div key={`${id}-${t.name}`} className="note-tag-pill">
                                    <span className="tag-dot" style={{ backgroundColor: t.color || TAG_COLORS[0] }}></span>
                                    <span className="tag-name">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="note-body">{text}</div>
                </div>
            );
        };

        const useReducedMotion = () => {
            const [reduced, setReduced] = React.useState(false);
            React.useEffect(() => {
                const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
                const update = () => setReduced(!!mq.matches);
                update();
                mq.addEventListener?.('change', update);
                return () => mq.removeEventListener?.('change', update);
            }, []);
            return reduced;
        };

        const WhisperText = ({ imagery, literal, forceLiteral, initialMs = 1800, className }) => {
            const [showLiteral, setShowLiteral] = React.useState(false);
            React.useEffect(() => {
                if (forceLiteral) {
                    setShowLiteral(true);
                    return;
                }
                setShowLiteral(false);
                const t = window.setTimeout(() => setShowLiteral(true), initialMs);
                return () => window.clearTimeout(t);
            }, [imagery, literal, forceLiteral, initialMs]);
            return (
                <span className={`whisper ${className || ''}`}>
                    <span className={`whisper-a ${showLiteral ? 'out' : 'in'}`}>{imagery}</span>
                    <span className={`whisper-b ${showLiteral ? 'in' : 'out'}`}>{literal}</span>
                </span>
            );
        };

        // --- 主应用 ---
        const App = () => {
            const [comments, setComments] = React.useState([]);
            const [currentIndex, setCurrentIndex] = React.useState(() => {
                const stored = safeReadStorage(STORAGE_KEYS.currentIndex, 0);
                return Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
            });
            const [droppedNotes, setDroppedNotes] = React.useState(() => safeReadStorage(STORAGE_KEYS.notes, []));
            const [activeSeason, setActiveSeason] = React.useState(null);
            const [transitionSeason, setTransitionSeason] = React.useState(null);
            const [isSeasonTransitioning, setIsSeasonTransitioning] = React.useState(false);
            const [vfxLevel, setVfxLevel] = React.useState('full');
            const [isUserInteracting, setIsUserInteracting] = React.useState(false);
            const [focusedNoteId, setFocusedNoteId] = React.useState(null);
            const [isAnimating, setIsAnimating] = React.useState(false);
            const [isModalOpen, setIsModalOpen] = React.useState(false);
            const [isDirectoryOpen, setIsDirectoryOpen] = React.useState(false);
            const [isTagEditorOpen, setIsTagEditorOpen] = React.useState(false);
            const [mode, setMode] = React.useState(() => {
                const stored = safeReadStorage(STORAGE_KEYS.mode, 'reading');
                return stored === 'editing' ? 'editing' : 'reading';
            });
            const [uiProfile, setUiProfile] = React.useState(() => {
                const stored = safeReadStorage(STORAGE_KEYS.uiProfile, 'classic');
                return stored === 'refined' ? 'refined' : 'classic';
            });
            const [directoryViewMode, setDirectoryViewMode] = React.useState(() => {
                const mode = safeReadStorage(STORAGE_KEYS.directoryViewMode, 'compact');
                return mode === 'detail' ? 'detail' : 'compact';
            });
            const initialArrangeState = React.useMemo(() => safeReadStorage(STORAGE_KEYS.arrange, null), []);
            const [arrangeMode, setArrangeMode] = React.useState(() => !!initialArrangeState?.mode);
            const [arrangeGroupKey, setArrangeGroupKey] = React.useState(() => typeof initialArrangeState?.groupKey === 'string' ? initialArrangeState.groupKey : null);
            const [arrangeGroupPageIndex, setArrangeGroupPageIndex] = React.useState(() => {
                if (Number.isFinite(initialArrangeState?.groupPageIndex)) return initialArrangeState.groupPageIndex;
                if (Number.isFinite(initialArrangeState?.pageIndex)) return initialArrangeState.pageIndex;
                return 0;
            });
            const [arrangeSearch, setArrangeSearch] = React.useState('');
            const [arrangeMatchCursor, setArrangeMatchCursor] = React.useState(0);
            const [groupingEnabled, setGroupingEnabled] = React.useState(() => initialArrangeState?.groupingEnabled !== false);
            const [selectedTags, setSelectedTags] = React.useState(() => Array.isArray(initialArrangeState?.selectedTags) ? initialArrangeState.selectedTags : []);
            const [includeUntagged, setIncludeUntagged] = React.useState(() => initialArrangeState?.includeUntagged !== false);
            const [tagPalette, setTagPalette] = React.useState(() => {
                const stored = safeReadStorage(STORAGE_KEYS.tagPalette, []);
                return Array.isArray(stored) ? stored : [];
            });
            const [tracks, setTracks] = React.useState(() => safeReadStorage(STORAGE_KEYS.tracks, []));
            const [currentTrackIndex, setCurrentTrackIndex] = React.useState(() => safeReadStorage(STORAGE_KEYS.currentTrackIndex, -1));
            const [isPlaying, setIsPlaying] = React.useState(false);
            const [progress, setProgress] = React.useState(0);
            const [currentTime, setCurrentTime] = React.useState(0);
            const [volume, setVolume] = React.useState(() => safeReadStorage(STORAGE_KEYS.volume, 0.58));
            const [orderMode, setOrderMode] = React.useState(() => safeReadStorage(STORAGE_KEYS.orderMode, 'sequential')); // 'sequential' | 'loop_one' | 'shuffle'
            const [favorites, setFavorites] = React.useState(() => safeReadStorage(STORAGE_KEYS.favorites, []));
            const [musicDockOpen, setMusicDockOpen] = React.useState(false);
            const [favoritesOpen, setFavoritesOpen] = React.useState(false);
            const [musicDockPinned, setMusicDockPinned] = React.useState(false);
            const [favoritesPinned, setFavoritesPinned] = React.useState(false);
            const [reunionNudgeOpen, setReunionNudgeOpen] = React.useState(false);
            const [audioEnergy, setAudioEnergy] = React.useState(0);
            const [isAutoReading, setIsAutoReading] = React.useState(false);
            const [arrangePanelOpen, setArrangePanelOpen] = React.useState(false);
            const [viewportProfile, setViewportProfile] = React.useState(() => getViewportProfile());
            const [toasts, setToasts] = React.useState([]);
            const [mobileControlsHeight, setMobileControlsHeight] = React.useState(76);
            const [mobileOnboardingPhase, setMobileOnboardingPhase] = React.useState(null);
            const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);

            const reducedMotion = useReducedMotion();
            const isMobile = viewportProfile.width <= 820;
            const isMobilePortrait = isMobile && viewportProfile.height > viewportProfile.width;
            const mobileDockExpanded = isMobile && (musicDockOpen || musicDockPinned);
            const mobileMoreVisible = isMobile && mobileMoreOpen && !mobileDockExpanded;
            
            const activeTextRef = React.useRef(null);
            const wheelAcc = React.useRef(0);
            const audioRef = React.useRef(null);
            const fileInputRef = React.useRef(null);
            const audioContextRef = React.useRef(null);
            const analyserRef = React.useRef(null);
            const sourceRef = React.useRef(null);
            const ambientBgRef = React.useRef(null);
            const progressRef = React.useRef(null);
            const audioEnergyRef = React.useRef(0);
            const lastEnergyUiUpdateRef = React.useRef(0);
            const displayedAudioEnergyRef = React.useRef(0);
            const seekCleanupRef = React.useRef(null);
            const toastIdRef = React.useRef(0);
            const reunionNudgeTimerRef = React.useRef(null);
            const pendingAutoplayRef = React.useRef(false);
            const isPlayingRef = React.useRef(false);
            const currentTrackIndexRef = React.useRef(-1);
            const tracksRef = React.useRef([]);
            const historyRef = React.useRef([]);
            const historyLockRef = React.useRef(false);
            const seasonStageRef = React.useRef(null);
            const seasonCanvasRef = React.useRef(null);
            const seasonCanvasNextRef = React.useRef(null);
            const seasonVfxRef = React.useRef(null);
            const seasonTransitionStartRef = React.useRef(0);
            const breathProgressRef = React.useRef(null);
            const autoReadLastTickRef = React.useRef(0);
            const controlsRef = React.useRef(null);
            const mobileControlsHeightRef = React.useRef(76);
            const mobileOnboardingSeenRef = React.useRef(safeReadStorage(STORAGE_KEYS.mobileOnboarding, false) === true);
            const mobileOnboardingTimersRef = React.useRef([]);
            const mobileOnboardingStopQueuedRef = React.useRef(false);

            const pushToast = React.useCallback((message) => {
                const id = ++toastIdRef.current;
                setToasts(prev => [...prev, { id, message }].slice(-4));
                window.setTimeout(() => {
                    setToasts(prev => prev.filter(item => item.id !== id));
                }, 3200);
            }, []);

            const writeStorage = React.useCallback((key, value) => {
                const ok = safeWriteStorage(key, value);
                if (!ok) pushToast('存储失败：可能空间不足或被浏览器限制');
                return ok;
            }, [pushToast]);

            const stopMobileOnboarding = React.useCallback(() => {
                mobileOnboardingTimersRef.current.forEach(t => window.clearTimeout(t));
                mobileOnboardingTimersRef.current = [];
                if (!mobileOnboardingSeenRef.current) {
                    mobileOnboardingSeenRef.current = true;
                    safeWriteStorage(STORAGE_KEYS.mobileOnboarding, true);
                }
                setMobileOnboardingPhase(null);
            }, []);

            React.useEffect(() => {
                mobileControlsHeightRef.current = mobileControlsHeight;
            }, [mobileControlsHeight]);

            React.useEffect(() => {
                if (!isMobile) return;
                const el = controlsRef.current;
                if (!el) return;
                let raf = 0;
                const update = () => {
                    window.cancelAnimationFrame(raf);
                    raf = window.requestAnimationFrame(() => {
                        const h = el.getBoundingClientRect?.().height || 0;
                        if (!h) return;
                        if (Math.abs(h - mobileControlsHeightRef.current) < 0.5) return;
                        setMobileControlsHeight(h);
                    });
                };
                update();
                let ro = null;
                if (window.ResizeObserver) {
                    ro = new ResizeObserver(update);
                    ro.observe(el);
                }
                window.addEventListener('resize', update, { passive: true });
                return () => {
                    window.removeEventListener('resize', update);
                    ro && ro.disconnect();
                    window.cancelAnimationFrame(raf);
                };
            }, [isMobile]);

            React.useEffect(() => {
                if (!isMobile) return;
                if (reducedMotion) return;
                if (mobileOnboardingSeenRef.current) return;
                if (mobileOnboardingPhase != null) return;
                const t = window.setTimeout(() => {
                    if (mobileOnboardingSeenRef.current) return;
                    setMobileOnboardingPhase('music');
                }, 650);
                return () => window.clearTimeout(t);
            }, [isMobile, reducedMotion, mobileOnboardingPhase]);

            React.useEffect(() => {
                if (!isMobile) return;
                if (!mobileOnboardingPhase) return;
                mobileOnboardingTimersRef.current.forEach(t => window.clearTimeout(t));
                mobileOnboardingTimersRef.current = [];
                const schedule = (fn, ms) => {
                    const t = window.setTimeout(fn, ms);
                    mobileOnboardingTimersRef.current.push(t);
                };
                if (mobileOnboardingPhase === 'music') schedule(() => setMobileOnboardingPhase('scroll'), 920);
                else if (mobileOnboardingPhase === 'scroll') schedule(() => setMobileOnboardingPhase('controls'), 920);
                else if (mobileOnboardingPhase === 'controls') schedule(() => stopMobileOnboarding(), 920);
            }, [isMobile, mobileOnboardingPhase, stopMobileOnboarding]);

            React.useEffect(() => {
                if (!isMobile) return;
                if (!mobileOnboardingPhase) return;
                const requestStop = () => {
                    if (mobileOnboardingStopQueuedRef.current) return;
                    mobileOnboardingStopQueuedRef.current = true;
                    window.setTimeout(() => {
                        mobileOnboardingStopQueuedRef.current = false;
                        stopMobileOnboarding();
                    }, 0);
                };
                const opts = { capture: true, passive: true };
                window.addEventListener('pointerdown', requestStop, opts);
                window.addEventListener('wheel', requestStop, opts);
                window.addEventListener('touchmove', requestStop, opts);
                window.addEventListener('keydown', requestStop, true);
                return () => {
                    window.removeEventListener('pointerdown', requestStop, opts);
                    window.removeEventListener('wheel', requestStop, opts);
                    window.removeEventListener('touchmove', requestStop, opts);
                    window.removeEventListener('keydown', requestStop, true);
                };
            }, [isMobile, mobileOnboardingPhase, stopMobileOnboarding]);

            React.useEffect(() => {
                if (!reducedMotion) return;
                if (!mobileOnboardingPhase) return;
                stopMobileOnboarding();
            }, [reducedMotion, mobileOnboardingPhase, stopMobileOnboarding]);

            React.useEffect(() => {
                if (!isMobile) {
                    if (mobileMoreOpen) setMobileMoreOpen(false);
                    return;
                }
                if (mobileDockExpanded && mobileMoreOpen) setMobileMoreOpen(false);
            }, [isMobile, mobileDockExpanded, mobileMoreOpen]);

            React.useEffect(() => {
                if (!isMobile) return;
                if (!mobileMoreOpen) return;
                if (isDirectoryOpen || isModalOpen || isTagEditorOpen) setMobileMoreOpen(false);
            }, [isMobile, mobileMoreOpen, isDirectoryOpen, isModalOpen, isTagEditorOpen]);

            const arrangeMetrics = React.useMemo(() => {
                const width = viewportProfile.width;
                const height = viewportProfile.height;
                const cols = width < 820 ? 2 : 3;
                const cardWidth = width < 820 ? Math.min(180, (width - 60) / cols) : 240;
                const gapX = width < 820 ? 12 : 20;
                const gapY = width < 820 ? 14 : 18;
                const topOffset = width < 820 ? 110 : 96;
                const cardHeight = width < 820 ? 104 : 112;
                const reserved = width < 820 ? 320 : 240;
                const rows = Math.max(1, Math.floor(Math.max(120, height - reserved) / (cardHeight + gapY)));
                const pageSize = Math.max(1, cols * rows);
                return { cols, cardWidth, cardHeight, gapX, gapY, topOffset, pageSize };
            }, [viewportProfile]);

            const noteById = React.useMemo(() => {
                const map = new Map();
                (Array.isArray(droppedNotes) ? droppedNotes : []).forEach(note => {
                    if (!note || note.id == null) return;
                    map.set(note.id, note);
                });
                return map;
            }, [droppedNotes]);

            const selectedTagSet = React.useMemo(() => {
                return new Set((Array.isArray(selectedTags) ? selectedTags : []).map(t => String(t || '').trim().toLowerCase()).filter(Boolean));
            }, [selectedTags]);

            const filteredNotes = React.useMemo(() => {
                const source = Array.isArray(droppedNotes) ? droppedNotes : [];
                if (!selectedTagSet.size) {
                    if (!includeUntagged) return source.filter(note => Array.isArray(note?.tags) && note.tags.length);
                    return source;
                }
                return source.filter(note => {
                    const tags = Array.isArray(note?.tags) ? note.tags : [];
                    if (!tags.length) return includeUntagged;
                    return tags.some(t => selectedTagSet.has(String(t?.name || '').trim().toLowerCase()));
                });
            }, [droppedNotes, includeUntagged, selectedTagSet]);

            const arrangeGroups = React.useMemo(() => {
                if (!groupingEnabled) {
                    return [
                        {
                            key: null,
                            label: '全部',
                            color: null,
                            noteIds: filteredNotes.map(n => n.id)
                        }
                    ];
                }

                const map = new Map();
                filteredNotes.forEach(note => {
                    const tags = Array.isArray(note?.tags) ? note.tags : [];
                    if (!tags.length) {
                        const key = '__untagged__';
                        if (!map.has(key)) map.set(key, { key, label: '未分类', color: null, noteIds: [] });
                        map.get(key).noteIds.push(note.id);
                        return;
                    }
                    tags.forEach(t => {
                        const name = String(t?.name || '').trim();
                        if (!name) return;
                        const key = name.toLowerCase();
                        const color = t?.color || tagPalette.find(p => String(p?.name || '').toLowerCase() === key)?.color || pickTagColor(name);
                        if (!map.has(key)) map.set(key, { key, label: name, color, noteIds: [] });
                        map.get(key).noteIds.push(note.id);
                    });
                });

                const paletteOrder = (Array.isArray(tagPalette) ? tagPalette : []).slice().sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0));
                const getRank = (key) => {
                    if (key === '__untagged__') return 999999;
                    const idx = paletteOrder.findIndex(p => String(p?.name || '').toLowerCase() === key);
                    return idx === -1 ? 9999 : idx;
                };

                return Array.from(map.values()).sort((a, b) => {
                    const ra = getRank(a.key);
                    const rb = getRank(b.key);
                    if (ra !== rb) return ra - rb;
                    return String(a.label).localeCompare(String(b.label), 'zh-CN');
                });
            }, [filteredNotes, groupingEnabled, pickTagColor, tagPalette]);

            const currentArrangeGroup = React.useMemo(() => {
                if (!arrangeGroups.length) return null;
                if (arrangeGroupKey == null) return arrangeGroups[0];
                return arrangeGroups.find(g => g.key === arrangeGroupKey) || arrangeGroups[0];
            }, [arrangeGroupKey, arrangeGroups]);

            React.useEffect(() => {
                if (!arrangeMode) return;
                if (!groupingEnabled) {
                    if (arrangeGroupKey !== null) setArrangeGroupKey(null);
                    return;
                }
                if (!arrangeGroups.length) return;
                if (arrangeGroupKey == null || !arrangeGroups.some(g => g.key === arrangeGroupKey)) {
                    setArrangeGroupKey(arrangeGroups[0].key);
                    setArrangeGroupPageIndex(0);
                }
            }, [arrangeMode, arrangeGroupKey, arrangeGroups, groupingEnabled]);

            const totalLayers = React.useMemo(() => {
                const ids = currentArrangeGroup?.noteIds || [];
                return Math.max(1, Math.ceil(ids.length / arrangeMetrics.pageSize));
            }, [arrangeMetrics.pageSize, currentArrangeGroup]);

            const arrangedNoteIds = React.useMemo(() => {
                if (!arrangeMode) return [];
                const ids = currentArrangeGroup?.noteIds || [];
                const start = arrangeGroupPageIndex * arrangeMetrics.pageSize;
                return ids.slice(start, start + arrangeMetrics.pageSize);
            }, [arrangeMode, arrangeGroupPageIndex, arrangeMetrics.pageSize, currentArrangeGroup]);

            const arrangedNotes = React.useMemo(() => {
                return arrangedNoteIds.map(id => noteById.get(id)).filter(Boolean);
            }, [arrangedNoteIds, noteById]);

            React.useEffect(() => {
                if (!arrangeMode) return;
                const max = Math.max(0, totalLayers - 1);
                if (arrangeGroupPageIndex > max) setArrangeGroupPageIndex(max);
            }, [arrangeMode, arrangeGroupPageIndex, totalLayers]);

            const pushHistory = React.useCallback(() => {
                if (historyLockRef.current) return;
                const snapshot = {
                    droppedNotes,
                    favorites,
                    arrangeMode,
                    arrangeGroupKey,
                    arrangeGroupPageIndex,
                    tracks,
                    currentTrackIndex,
                    orderMode,
                    volume
                };
                historyRef.current = [...historyRef.current, snapshot].slice(-30);
            }, [arrangeMode, arrangeGroupKey, arrangeGroupPageIndex, currentTrackIndex, droppedNotes, favorites, orderMode, tracks, volume]);

            const undo = React.useCallback(() => {
                const snapshot = historyRef.current.pop();
                if (!snapshot) {
                    pushToast('没有可撤销的操作');
                    return;
                }
                historyLockRef.current = true;
                setDroppedNotes(snapshot.droppedNotes || []);
                setFavorites(snapshot.favorites || []);
                setArrangeMode(!!snapshot.arrangeMode);
                setArrangeGroupKey(typeof snapshot.arrangeGroupKey === 'string' ? snapshot.arrangeGroupKey : null);
                setArrangeGroupPageIndex(Number.isFinite(snapshot.arrangeGroupPageIndex) ? snapshot.arrangeGroupPageIndex : 0);
                setTracks(Array.isArray(snapshot.tracks) ? snapshot.tracks : []);
                setCurrentTrackIndex(Number.isFinite(snapshot.currentTrackIndex) ? snapshot.currentTrackIndex : -1);
                setOrderMode(snapshot.orderMode === 'sequential' || snapshot.orderMode === 'loop_one' || snapshot.orderMode === 'shuffle' ? snapshot.orderMode : 'sequential');
                setVolume(Number.isFinite(snapshot.volume) ? Math.min(Math.max(snapshot.volume, 0), 1) : 0.58);
                setFocusedNoteId(null);
                window.setTimeout(() => {
                    historyLockRef.current = false;
                }, 0);
            }, [pushToast]);

            const arrangeMatches = React.useMemo(() => {
                const q = String(arrangeSearch || '').trim().toLowerCase();
                if (!q) return [];
                const matches = [];
                filteredNotes.forEach((note) => {
                    const text = String(note?.text || '').toLowerCase();
                    const tagText = Array.isArray(note?.tags) ? note.tags.map(t => String(t?.name || '')).join(' ').toLowerCase() : '';
                    if (text.includes(q) || tagText.includes(q)) matches.push({ id: note.id });
                });
                return matches;
            }, [arrangeSearch, filteredNotes]);

            React.useEffect(() => {
                setArrangeMatchCursor(0);
            }, [arrangeSearch]);

            const locateMatchAt = React.useCallback((cursor) => {
                if (!arrangeMatches.length) {
                    pushToast('未找到匹配的便签');
                    return;
                }
                const nextCursor = ((cursor % arrangeMatches.length) + arrangeMatches.length) % arrangeMatches.length;
                const hit = arrangeMatches[nextCursor];
                const hitId = hit.id;
                const note = noteById.get(hitId);
                let nextGroupKey = null;
                if (groupingEnabled) {
                    const tags = Array.isArray(note?.tags) ? note.tags : [];
                    const candidates = tags.map(t => String(t?.name || '').trim()).filter(Boolean);
                    const preferred = selectedTagSet.size ? candidates.find(name => selectedTagSet.has(name.toLowerCase())) : null;
                    const picked = preferred || candidates[0];
                    nextGroupKey = picked ? picked.toLowerCase() : '__untagged__';
                    if (!arrangeGroups.some(g => g.key === nextGroupKey)) {
                        nextGroupKey = arrangeGroups[0]?.key ?? '__untagged__';
                    }
                }
                const group = arrangeGroups.find(g => (g.key ?? null) === (nextGroupKey ?? null)) || arrangeGroups[0];
                const ids = group?.noteIds || [];
                const pos = ids.indexOf(hitId);
                const pageIndex = pos >= 0 ? Math.floor(pos / arrangeMetrics.pageSize) : 0;
                setArrangeMode(true);
                setArrangeGroupKey(nextGroupKey);
                setArrangeGroupPageIndex(pageIndex);
                setFocusedNoteId(hitId);
                setArrangeMatchCursor(nextCursor);
            }, [arrangeGroups, arrangeMatches, arrangeMetrics.pageSize, groupingEnabled, noteById, pushToast, selectedTagSet]);

            const locatePrevMatch = React.useCallback(() => {
                if (!arrangeMatches.length) {
                    pushToast('未找到匹配的便签');
                    return;
                }
                locateMatchAt(arrangeMatchCursor - 1);
            }, [arrangeMatchCursor, arrangeMatches.length, locateMatchAt, pushToast]);

            const locateNextMatch = React.useCallback(() => {
                if (!arrangeMatches.length) {
                    pushToast('未找到匹配的便签');
                    return;
                }
                locateMatchAt(arrangeMatchCursor + 1);
            }, [arrangeMatchCursor, arrangeMatches.length, locateMatchAt, pushToast]);

            // 初始化数据
            React.useEffect(() => {
                const storedComments = safeReadStorage(STORAGE_KEYS.comments, null);
                if (Array.isArray(storedComments) && storedComments.length) {
                    setComments(storedComments);
                    return;
                }
                fetch('comments.json')
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            setComments(data);
                        } else {
                            setComments(DEFAULT_COMMENTS);
                        }
                    })
                    .catch(() => {
                        setComments(DEFAULT_COMMENTS);
                    });
            }, []);

            React.useEffect(() => {
                audioRef.current = new Audio();
                const audio = audioRef.current;
                audio.volume = volume;
                const handleTime = () => {
                    if (!audio.duration) return;
                    setCurrentTime(audio.currentTime);
                    setProgress((audio.currentTime / audio.duration) * 100);
                };
                const tryFallback = () => {
                    const idx = currentTrackIndexRef.current;
                    const track = (tracksRef.current || [])[idx];
                    if (track && Array.isArray(track.altUrls) && track.altUrls.length) {
                        const triedKey = `fallback-${track.id || track.url}`;
                        const tried = (audio.__ambientTried || (audio.__ambientTried = {}));
                        const cursor = Number.isFinite(tried[triedKey]) ? tried[triedKey] : 0;
                        if (cursor < track.altUrls.length) {
                            const nextUrl = track.altUrls[cursor];
                            tried[triedKey] = cursor + 1;
                            audio.src = nextUrl;
                            audio.load();
                            if (pendingAutoplayRef.current || isPlayingRef.current) {
                                audio.play().catch(() => setIsPlaying(false));
                                setIsPlaying(true);
                            }
                            return true;
                        }
                    }
                    return false;
                };

                const handleError = () => {
                    if (tryFallback()) return;
                    pushToast('音乐加载失败：请检查文件或刷新曲库');
                };

                const handleStalled = () => {
                    tryFallback();
                };
                audio.addEventListener('timeupdate', handleTime);
                audio.addEventListener('error', handleError);
                audio.addEventListener('stalled', handleStalled);
                return () => {
                    audio.pause();
                    audio.removeEventListener('timeupdate', handleTime);
                    audio.removeEventListener('error', handleError);
                    audio.removeEventListener('stalled', handleStalled);
                    tracks.forEach(track => {
                        if (track.url.startsWith('blob:')) URL.revokeObjectURL(track.url);
                    });
                };
            }, [pushToast]);

            React.useEffect(() => {
                setTracks(prev => prev.map(t => {
                    if (!t || typeof t.url !== 'string') return t;
                    if (!t.url.startsWith('/music/')) return t;
                    const file = decodeURIComponent(t.url.split('/').pop() || '');
                    const candidates = buildMusicUrlCandidates(file);
                    if (!candidates.length) return t;
                    const primary = candidates[0];
                    const merged = Array.from(new Set([...candidates.slice(1), t.url, ...(Array.isArray(t.altUrls) ? t.altUrls : [])].filter(Boolean)));
                    const altUrls = merged.filter(u => u !== primary);
                    if (t.url === primary && JSON.stringify(t.altUrls || []) === JSON.stringify(altUrls)) return t;
                    return { ...t, url: primary, altUrls };
                }));
            }, []);

            React.useEffect(() => {
                const stored = safeReadStorage(STORAGE_KEYS.tracks, []);
                const list = Array.isArray(stored) ? stored : [];
                const uploads = list.filter(t => t && t.source === 'upload' && typeof t.blobKey === 'string' && t.blobKey);
                if (!uploads.length) return;
                Promise.all(uploads.map(async (t) => {
                    const blob = await getMusicBlob(t.blobKey);
                    if (!blob) return null;
                    const url = URL.createObjectURL(blob);
                    return { ...t, url };
                })).then((restored) => {
                    const nextUploads = restored.filter(Boolean);
                    if (!nextUploads.length) return;
                    setTracks(prev => {
                        const keep = prev.filter(t => !(t && t.source === 'upload'));
                        return [...keep, ...nextUploads];
                    });
                }).catch(() => {});
            }, []);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.comments, comments);
            }, [comments]);

            React.useEffect(() => {
                if (!comments.length) return;
                setCurrentIndex(prev => Math.max(0, Math.min(comments.length - 1, prev)));
            }, [comments.length]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.currentIndex, currentIndex);
            }, [currentIndex]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.volume, volume);
            }, [volume]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.orderMode, orderMode);
            }, [orderMode]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.favorites, favorites);
            }, [favorites]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.tracks, serializeTracksForStorage(tracks));
            }, [tracks]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.currentTrackIndex, currentTrackIndex);
            }, [currentTrackIndex]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.notes, droppedNotes);
            }, [droppedNotes]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.arrange, {
                    mode: arrangeMode,
                    groupKey: arrangeGroupKey,
                    groupPageIndex: arrangeGroupPageIndex,
                    groupingEnabled,
                    selectedTags,
                    includeUntagged
                });
            }, [arrangeMode, arrangeGroupKey, arrangeGroupPageIndex, groupingEnabled, includeUntagged, selectedTags]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.mode, mode);
            }, [mode]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.tagPalette, tagPalette);
            }, [tagPalette]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.directoryViewMode, directoryViewMode);
            }, [directoryViewMode]);

            React.useEffect(() => {
                writeStorage(STORAGE_KEYS.uiProfile, uiProfile);
            }, [uiProfile]);

            React.useEffect(() => {
                if (mode !== 'reading') return;
                setArrangeMode(false);
                setArrangeSearch('');
                setFocusedNoteId(null);
            }, [mode]);

            React.useEffect(() => {
                const audio = audioRef.current;
                if (audio) audio.volume = volume;
            }, [volume]);

            React.useEffect(() => {
                const audio = audioRef.current;
                if (!audio || audioContextRef.current) return;
                const setup = () => {
                    if (audioContextRef.current) return;
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;
                    const ctx = new AudioCtx();
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 128;
                    const source = ctx.createMediaElementSource(audio);
                    const silentGain = ctx.createGain();
                    silentGain.gain.value = 0;
                    source.connect(ctx.destination);
                    source.connect(analyser);
                    analyser.connect(silentGain);
                    silentGain.connect(ctx.destination);
                    audioContextRef.current = ctx;
                    analyserRef.current = analyser;
                    sourceRef.current = source;
                    ctx.resume().catch(() => {});
                };
                audio.addEventListener('play', setup, { once: true });
                return () => {
                    audio.removeEventListener('play', setup);
                };
            }, []);

            React.useEffect(() => {
                let rafId = null;
                const tick = () => {
                    const analyser = analyserRef.current;
                    const bg = ambientBgRef.current;
                    if (analyser && bg && isPlaying) {
                        const data = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(data);
                        const avg = data.reduce((sum, val) => sum + val, 0) / data.length / 255;
                        audioEnergyRef.current = avg;
                        const now = performance.now();
                        if (now - lastEnergyUiUpdateRef.current > 260 || Math.abs(avg - displayedAudioEnergyRef.current) > 0.07) {
                            lastEnergyUiUpdateRef.current = now;
                            displayedAudioEnergyRef.current = avg;
                            setAudioEnergy(avg);
                        }
                        const blur = 80 + avg * 1.4;
                        const opacity = 0.42 + avg * 0.018;
                        bg.style.filter = `blur(${blur.toFixed(2)}px) brightness(${(1 + avg * 0.018).toFixed(3)})`;
                        bg.style.opacity = opacity.toFixed(3);
                    } else if (bg) {
                        bg.style.filter = 'blur(80px) brightness(1)';
                        bg.style.opacity = '0.42';
                        audioEnergyRef.current = 0;
                        if (displayedAudioEnergyRef.current !== 0) {
                            displayedAudioEnergyRef.current = 0;
                            setAudioEnergy(0);
                        }
                    }
                    rafId = requestAnimationFrame(tick);
                };
                rafId = requestAnimationFrame(tick);
                return () => cancelAnimationFrame(rafId);
            }, [isPlaying]);

            React.useEffect(() => {
                const audio = audioRef.current;
                if (!audio) return;
                const onEnded = () => {
                    if (!tracks.length) { setIsPlaying(false); setProgress(0); return; }
                    if (orderMode === 'loop_one') {
                        audio.currentTime = 0;
                        audio.play().catch(()=>{});
                        setIsPlaying(true);
                        return;
                    }
                    if (orderMode === 'shuffle') {
                        let ni = Math.floor(Math.random() * tracks.length);
                        if (tracks.length > 1 && ni === currentTrackIndex) ni = (ni + 1) % tracks.length;
                        setCurrentTrackIndex(ni);
                        setIsPlaying(true);
                        return;
                    }
                    const ni = (currentTrackIndex + 1) % tracks.length;
                    setCurrentTrackIndex(ni);
                    setIsPlaying(true);
                };
                audio.addEventListener('ended', onEnded);
                return () => {
                    audio.removeEventListener('ended', onEnded);
                };
            }, [orderMode, tracks, currentTrackIndex]);

            const refreshLibraryTracks = React.useCallback(async () => {
                const mergeCandidates = (candidates) => {
                    if (!candidates.length) return;
                    setTracks(prev => {
                        const seen = new Set();
                        const next = [...prev, ...candidates].filter(track => {
                            const key = track.url || `${track.name}-${track.id}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                        if (next.length && currentTrackIndex === -1) setCurrentTrackIndex(0);
                        return next;
                    });
                };

                try {
                    const res = await fetch('/music/manifest.json', { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        const candidates = tracksFromManifest(data);
                        mergeCandidates(candidates);
                        return;
                    }
                } catch (e) {
                }

                if (!import.meta.env.DEV) {
                    pushToast('曲库加载失败：未找到 manifest.json（请重新构建/上传）');
                    return;
                }

                try {
                    const res = await fetch('/music/');
                    if (!res.ok) return;
                    const html = await res.text();
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const as = Array.from(doc.querySelectorAll('a'));
                    const candidates = as
                        .map(a => a.getAttribute('href') || '')
                        .filter(href => /\.(mp3|wav|ogg)$/i.test(href))
                        .map(href => {
                            const url = href.startsWith('http') ? href : `/music/${href}`.replace('/music//', '/music/');
                            const last = decodeURIComponent(url.split('/').pop() || '');
                            const name = last.replace(/\.[^/.]+$/, '');
                            return { id: `lib-${name}-${Date.now()}-${Math.random()}`, name, url, source: 'library' };
                        });
                    mergeCandidates(candidates);
                } catch (e) {
                    pushToast('曲库加载失败：网络或权限问题');
                }
            }, [currentTrackIndex, pushToast]);

            React.useEffect(() => {
                refreshLibraryTracks();
            }, []);

            const attemptAutoplay = React.useCallback(async (fromGesture) => {
                const audio = audioRef.current;
                if (!audio || !tracks.length) return;
                const idx = currentTrackIndex >= 0 ? currentTrackIndex : 0;
                const targetTrack = tracks[idx];
                if (!targetTrack) return;
                if (currentTrackIndex < 0) setCurrentTrackIndex(idx);

                // 先确保音源已经挂载，避免3秒定时触发时出现空播。
                const expectedSrc = new URL(targetTrack.url, window.location.href).href;
                if (audio.src !== expectedSrc) {
                    audio.src = targetTrack.url;
                    audio.load();
                    setCurrentTime(0);
                    setProgress(0);
                }
                audioContextRef.current?.resume?.().catch(() => {});
                const prevMuted = audio.muted;
                const prevVolume = audio.volume;
                audio.muted = true;
                try {
                    await audio.play();
                    pendingAutoplayRef.current = false;
                    setIsPlaying(true);
                    window.setTimeout(() => {
                        audio.muted = prevMuted;
                        audio.volume = volume;
                    }, 80);
                } catch (e) {
                    audio.muted = prevMuted;
                    audio.volume = prevVolume;
                    setIsPlaying(false);
                    pendingAutoplayRef.current = true;
                    if (!fromGesture) pushToast('点击任意位置开始播放');
                }
            }, [currentTrackIndex, pushToast, tracks, volume]);

            React.useEffect(() => {
                isPlayingRef.current = isPlaying;
            }, [isPlaying]);

            React.useEffect(() => {
                currentTrackIndexRef.current = currentTrackIndex;
            }, [currentTrackIndex]);

            React.useEffect(() => {
                tracksRef.current = tracks;
            }, [tracks]);

            const AUTOPLAY_DELAY_MS = 3000;
            useMusicAutoplay({
                delayMs: AUTOPLAY_DELAY_MS,
                tracksLength: tracks.length,
                pendingAutoplayRef,
                attemptAutoplay,
            });

            React.useEffect(() => {
                const audio = audioRef.current;
                if (!audio || currentTrackIndex < 0 || !tracks[currentTrackIndex]) return;
                const nextSrc = new URL(tracks[currentTrackIndex].url, window.location.href).href;
                if (audio.src !== nextSrc) {
                    audio.src = tracks[currentTrackIndex].url;
                    setCurrentTime(0);
                    setProgress(0);
                }
                if (isPlaying) {
                    audio.play().catch(() => setIsPlaying(false));
                }
            }, [currentTrackIndex, tracks]);

            React.useEffect(() => {
                const audio = audioRef.current;
                if (!audio || currentTrackIndex < 0) return;
                if (isPlaying) {
                    audio.play().catch(() => setIsPlaying(false));
                } else {
                    audio.pause();
                }
            }, [isPlaying, currentTrackIndex]);

            React.useEffect(() => {
                if (!isAutoReading || isModalOpen) return;
                autoReadLastTickRef.current = performance.now();
                const timer = window.setInterval(() => {
                    if (!isAnimating) {
                        handleNext();
                    }
                }, AUTO_READ_INTERVAL_MS);
                return () => window.clearInterval(timer);
            }, [isAutoReading, isModalOpen, isAnimating, currentIndex, comments.length]);

            React.useEffect(() => {
                const handleResize = () => {
                    setViewportProfile(getViewportProfile());
                    setDroppedNotes(prev => prev.map(note => {
                        const width = window.innerWidth;
                        const height = window.innerHeight;
                        const maxX = Math.max(12, width - (width < 820 ? 230 : 340));
                        const maxY = Math.max(150, height - (width < 820 ? 220 : 180));
                        return {
                            ...note,
                            pos: {
                                ...note.pos,
                                x: Math.min(Math.max(12, note.pos.x), maxX),
                                y: Math.min(Math.max(width < 820 ? 110 : 24, note.pos.y), maxY)
                            }
                        };
                    }));
                };

                window.addEventListener('resize', handleResize);
                return () => window.removeEventListener('resize', handleResize);
            }, []);

            React.useEffect(() => {
                document.body.dataset.viewportMode = viewportProfile.mode;
            }, [viewportProfile]);

            React.useEffect(() => {
                const next = getSeasonByNoteCount(droppedNotes.length);
                const t = window.setTimeout(() => {
                    if (next === activeSeason) return;
                    setTransitionSeason(next);
                    setIsSeasonTransitioning(true);
                }, 300);
                return () => window.clearTimeout(t);
            }, [droppedNotes.length, activeSeason]);

            React.useEffect(() => {
                if (!isSeasonTransitioning) return;
                seasonTransitionStartRef.current = performance.now();
                const t = window.setTimeout(() => {
                    setActiveSeason(transitionSeason);
                    setIsSeasonTransitioning(false);
                }, 1400);
                return () => window.clearTimeout(t);
            }, [isSeasonTransitioning, transitionSeason]);

            React.useEffect(() => {
                if (reducedMotion) return;
                let raf = 0;
                const stage = seasonStageRef.current;
                if (!stage) return;
                let nx = 0;
                let ny = 0;
                const onMove = (e) => {
                    const x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
                    const y = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
                    nx = Math.max(-1, Math.min(1, x));
                    ny = Math.max(-1, Math.min(1, y));
                    if (!raf) {
                        raf = window.requestAnimationFrame(() => {
                            raf = 0;
                            stage.style.setProperty('--px', nx.toFixed(4));
                            stage.style.setProperty('--py', ny.toFixed(4));
                        });
                    }
                };
                window.addEventListener('pointermove', onMove, { passive: true });
                return () => {
                    window.removeEventListener('pointermove', onMove);
                    if (raf) window.cancelAnimationFrame(raf);
                };
            }, [reducedMotion]);

            React.useEffect(() => {
                let t = null;
                const mark = () => {
                    setIsUserInteracting(true);
                    window.clearTimeout(t);
                    t = window.setTimeout(() => setIsUserInteracting(false), 1200);
                };
                window.addEventListener('wheel', mark, { passive: true });
                window.addEventListener('pointerdown', mark, { passive: true });
                window.addEventListener('touchstart', mark, { passive: true });
                return () => {
                    window.removeEventListener('wheel', mark);
                    window.removeEventListener('pointerdown', mark);
                    window.removeEventListener('touchstart', mark);
                    window.clearTimeout(t);
                };
            }, []);

            React.useEffect(() => {
                const el = breathProgressRef.current;
                if (!el) return;
                if (!isAutoReading || reducedMotion) {
                    el.style.removeProperty('--breath-dot-x');
                    el.style.removeProperty('--breath-period');
                    return;
                }
                el.style.setProperty('--breath-period', `${AUTO_READ_INTERVAL_MS}ms`);
                let raf = 0;
                const loop = () => {
                    const now = performance.now();
                    const elapsed = now - autoReadLastTickRef.current;
                    const p = Math.max(0, Math.min(1, elapsed / AUTO_READ_INTERVAL_MS));
                    const rect = el.getBoundingClientRect();
                    const w = Math.max(80, rect.width || 140);
                    const leftPad = 10;
                    const rightPad = 16;
                    const maxX = Math.max(leftPad, w - rightPad);
                    const x = leftPad + p * (maxX - leftPad);
                    el.style.setProperty('--breath-dot-x', `${x.toFixed(1)}px`);
                    raf = window.requestAnimationFrame(loop);
                };
                raf = window.requestAnimationFrame(loop);
                return () => {
                    if (raf) window.cancelAnimationFrame(raf);
                };
            }, [isAutoReading, reducedMotion]);

            React.useEffect(() => {
                const canvasA = seasonCanvasRef.current;
                const canvasB = seasonCanvasNextRef.current;
                const stage = seasonStageRef.current;
                if (!canvasA || !canvasB || !stage) return;
                if (reducedMotion) {
                    const ctxA = canvasA.getContext('2d');
                    const ctxB = canvasB.getContext('2d');
                    ctxA?.clearRect(0, 0, canvasA.width, canvasA.height);
                    ctxB?.clearRect(0, 0, canvasB.width, canvasB.height);
                    return;
                }

                let raf = 0;
                let last = performance.now();
                let fpsSamples = [];
                let degraded = false;
                const rngA = createRng(1217);
                const rngB = createRng(8923);
                let particlesA = [];
                let particlesB = [];
                let ripplesA = [];
                let ripplesB = [];
                let pileA = [];
                let pileB = [];
                let disturb = null;

                const setupCanvas = (canvas) => {
                    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
                    const rect = canvas.getBoundingClientRect();
                    const w = Math.max(1, Math.floor(rect.width));
                    const h = Math.max(1, Math.floor(rect.height));
                    canvas.width = Math.floor(w * dpr);
                    canvas.height = Math.floor(h * dpr);
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    return { ctx, w, h, dpr };
                };

                let geomA = setupCanvas(canvasA);
                let geomB = setupCanvas(canvasB);

                const onResize = () => {
                    geomA = setupCanvas(canvasA);
                    geomB = setupCanvas(canvasB);
                };

                window.addEventListener('resize', onResize);

                seasonVfxRef.current = {
                    addRipple: (x, y) => {
                        const now = performance.now();
                        const season = isSeasonTransitioning ? transitionSeason : activeSeason;
                        if (!season) return;
                        if (degraded) return;
                        const r = spawnRipple(season, x, y, now);
                        if (isSeasonTransitioning) ripplesB.push(r);
                        else ripplesA.push(r);
                    },
                    setDisturb: (x, y) => {
                        if (degraded) return;
                        disturb = { x, y, t: performance.now() };
                    },
                    clearDisturb: () => {
                        disturb = null;
                    }
                };

                const getTargetCount = (season, intensity = 1) => {
                    if (!season) return 0;
                    const base = season === 'summer' ? 86 : season === 'winter' ? 92 : season === 'autumn' ? 78 : 92;
                    const mult = (vfxLevel === 'low' || degraded) ? 0.45 : 1;
                    return Math.max(0, Math.floor(base * mult * Math.max(0, intensity)));
                };

                const getSummerMeadowCache = (ctx, geom) => {
                    const tier = (reducedMotion || vfxLevel === 'low' || degraded) ? 'low' : 'high';
                    const existing = ctx.__summerMeadow;
                    if (existing && existing.w === geom.w && existing.h === geom.h && existing.tier === tier) return existing;
                    const bladeCount = tier === 'low' ? 160 : 320;
                    const flowerCount = tier === 'low' ? 34 : 80;
                    const factory = window.AmbientDreamUtils?.createSummerMeadowLayout;
                    const layout = (typeof factory === 'function')
                        ? factory({ width: geom.w, height: geom.h, bladeCount, flowerCount, seed: 7331 })
                        : { grass: [], flowers: [] };
                    const cache = { w: geom.w, h: geom.h, tier, grass: layout.grass || [], flowers: layout.flowers || [] };
                    ctx.__summerMeadow = cache;
                    return cache;
                };

                const drawSummerMeadow = (ctx, geom, t, clearZone, intensity) => {
                    const cache = getSummerMeadowCache(ctx, geom);
                    const w = geom.w;
                    const h = geom.h;
                    const low = cache.tier === 'low';
                    const wind = reducedMotion ? 0 : (low ? 0.85 : 1);
                    const swayBase = (low ? 12 : 18) * wind;
                    const k = (intensity ?? 1);
                    const fadeBottomStart = h * 0.90;
                    const fadeBottomEnd = h * 0.985;
                    const safeTop = clearZone ? Math.min(h, clearZone.y + clearZone.r * 0.75) : h * 0.64;

                    ctx.save();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.lineCap = 'round';
                    const g = ctx.createLinearGradient(0, h * 0.68, 0, h);
                    g.addColorStop(0, 'rgba(56, 90, 82, 0.00)');
                    g.addColorStop(1, 'rgba(56, 90, 82, 0.30)');
                    ctx.globalAlpha = 0.70 * k;
                    ctx.fillStyle = g;
                    ctx.fillRect(0, h * 0.68, w, h * 0.32);

                    const drawGrassItem = (b, i) => {
                        if (b.y < safeTop) return;
                        const by = b.y;
                        const fadeBottom = by >= fadeBottomStart
                            ? Math.max(0, Math.min(1, 1 - (by - fadeBottomStart) / Math.max(1, (fadeBottomEnd - fadeBottomStart))))
                            : 1;
                        const baseAlpha = (0.18 + 0.14 * Math.sin((t * 0.0008) + b.phase)) * k * fadeBottom;
                        if (baseAlpha <= 0.002) return;
                        const sway = Math.sin(t * 0.0012 * b.f + b.phase) * swayBase;
                        const tipX = b.x + sway + b.lean * b.h * 0.6;
                        const tipY = by - b.h;
                        const midX = b.x + sway * 0.25 + b.lean * b.h * 0.32;
                        const midY = by - b.h * 0.55;
                        if (b.kind === 'broad') {
                            ctx.save();
                            ctx.globalAlpha = Math.min(0.6, baseAlpha * 0.9);
                            ctx.translate(b.x, by);
                            ctx.rotate(b.lean * 0.35 + Math.sin(t * 0.0009 + b.phase) * 0.06);
                            const leafW = 8 + b.w * 5;
                            const leafH = 20 + b.h * 0.32;
                            ctx.fillStyle = 'rgba(128, 192, 152, 0.70)';
                            ctx.shadowColor = 'rgba(146, 210, 168, 0.22)';
                            ctx.shadowBlur = 10;
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.quadraticCurveTo(leafW, -leafH * 0.42, 0, -leafH);
                            ctx.quadraticCurveTo(-leafW, -leafH * 0.42, 0, 0);
                            ctx.fill();
                            ctx.restore();
                            return;
                        }

                        ctx.globalAlpha = baseAlpha;
                        ctx.strokeStyle = (i % 9 === 0) ? 'rgba(210, 244, 220, 1)' : 'rgba(146, 210, 168, 1)';
                        ctx.lineWidth = b.w;
                        ctx.beginPath();
                        ctx.moveTo(b.x, by);
                        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
                        ctx.stroke();

                        if (b.kind === 'blade' && b.split) {
                            ctx.globalAlpha = baseAlpha * 0.75;
                            ctx.lineWidth = Math.max(0.7, b.w * 0.85);
                            ctx.beginPath();
                            ctx.moveTo(b.x + 0.8, by);
                            ctx.quadraticCurveTo(midX + 6, midY + 6, tipX + 10, tipY + 8);
                            ctx.stroke();
                        }

                        if (b.kind === 'seed') {
                            const tw = 0.55 + 0.45 * Math.sin(t * 0.0022 * (b.f + 0.4) + b.phase);
                            const puff = (b.puff || 0.7);
                            ctx.save();
                            ctx.globalAlpha = Math.min(0.55, baseAlpha * (0.9 + 0.25 * tw));
                            ctx.translate(tipX, tipY);
                            ctx.rotate(b.lean * 0.25);
                            ctx.fillStyle = 'rgba(210, 236, 208, 0.65)';
                            ctx.shadowColor = 'rgba(210, 236, 208, 0.28)';
                            ctx.shadowBlur = 12 + 10 * tw;
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 2.2 + puff * 4.2, 6.2 + puff * 9.4, 0.4, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    };

                    const drawFlower = (f, i) => {
                        if (f.y < safeTop) return;
                        const fy = f.y;
                        const fadeStart = h * 0.94;
                        const fadeEnd = h * 0.99;
                        const fadeBottom = fy >= fadeStart
                            ? Math.max(0, Math.min(1, 1 - (fy - fadeStart) / Math.max(1, (fadeEnd - fadeStart))))
                            : 1;
                        const tw = 0.55 + 0.45 * Math.sin(t * 0.0022 * f.f + f.phase);
                        const a = (0.22 + 0.26 * tw) * k * fadeBottom;
                        if (a <= 0.0015) return;
                        ctx.save();
                        ctx.globalAlpha = a;
                        const rr = f.r * (0.72 + 0.30 * tw);
                        if (f.kind === 'clover') {
                            ctx.fillStyle = 'rgba(255, 205, 228, 1)';
                            ctx.shadowColor = 'rgba(255, 205, 228, 0.42)';
                            ctx.shadowBlur = 16 + 14 * tw;
                            ctx.beginPath();
                            ctx.arc(f.x + rr * 0.6, fy, rr, 0, Math.PI * 2);
                            ctx.arc(f.x - rr * 0.6, fy, rr, 0, Math.PI * 2);
                            ctx.arc(f.x, fy - rr * 0.7, rr, 0, Math.PI * 2);
                            ctx.arc(f.x, fy + rr * 0.7, rr * 0.9, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.shadowColor = 'rgba(248, 242, 230, 0.36)';
                            ctx.shadowBlur = 14 + 12 * tw;
                            ctx.translate(f.x, fy);
                            ctx.rotate(f.phase * 0.15);
                            const petals = 6 + (i % 3);
                            ctx.fillStyle = 'rgba(248, 242, 230, 1)';
                            for (let p = 0; p < petals; p++) {
                                const ang = (p / petals) * Math.PI * 2;
                                const px = Math.cos(ang) * rr * 1.6;
                                const py = Math.sin(ang) * rr * 1.1;
                                ctx.beginPath();
                                ctx.ellipse(px, py, rr * 0.9, rr * 0.52, ang, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            ctx.fillStyle = 'rgba(244, 214, 136, 1)';
                            ctx.beginPath();
                            ctx.arc(0, 0, rr * 0.72, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    };

                    cache.grass.forEach(drawGrassItem);
                    cache.flowers.forEach(drawFlower);
                    ctx.restore();
                };

                const drawAutumnPile = (ctx, season, pile, t, intensity) => {
                    if (!pile?.length) return;
                    const k = intensity ?? 1;
                    for (const p of pile) {
                        drawSeasonParticle(ctx, season, p, t, k);
                    }
                };

                const tickLayer = (season, geom, ctx, particles, ripples, pile, rng, dt, t, clearZone, intensity) => {
                    if (!ctx || !season) {
                        if (ctx) ctx.clearRect(0, 0, geom.w, geom.h);
                        return { particles: [], ripples: [], pile: [] };
                    }
                    ctx.clearRect(0, 0, geom.w, geom.h);
                    if (season === 'summer') drawSummerMeadow(ctx, geom, t, clearZone, intensity);
                    if (season === 'autumn') drawAutumnPile(ctx, season, pile, t, intensity);
                    const target = getTargetCount(season, intensity);
                    const spawnOutside = () => {
                        for (let i = 0; i < 14; i++) {
                            const p = spawnSeasonParticle(season, rng, geom.w, geom.h);
                            if (!p) continue;
                            if (!clearZone || p.kind === 'fog') return p;
                            const dx = p.x - clearZone.x;
                            const dy = p.y - clearZone.y;
                            if ((dx * dx + dy * dy) > (clearZone.r * clearZone.r)) return p;
                        }
                        return spawnSeasonParticle(season, rng, geom.w, geom.h);
                    };
                    while (particles.length < target) {
                        const p = spawnOutside();
                        if (p) particles.push(p);
                        else break;
                    }
                    if (particles.length > target) particles = particles.slice(0, target);
                    const nextParticles = [];
                    for (const p of particles) {
                        if (disturb && (t - disturb.t) < 140) {
                            const dx = p.x - disturb.x;
                            const dy = p.y - disturb.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < 240 * 240) {
                                const d = Math.sqrt(d2 + 1);
                                const f = (1 - d / 240) * 0.9;
                                p.vx += (dx / d) * f * 0.02;
                                p.vy += (dy / d) * f * 0.01;
                            }
                        }
                        if (stepSeasonParticle(season, p, dt, t, geom.w, geom.h)) {
                            let fade = 1;
                            if (clearZone) {
                                const dx = p.x - clearZone.x;
                                const dy = p.y - clearZone.y;
                                const d = Math.sqrt(dx * dx + dy * dy);
                                if (d < clearZone.r) {
                                    const edge = Math.max(1, clearZone.r * 0.26);
                                    const base = Math.max(0, Math.min(1, (d - (clearZone.r - edge)) / edge));
                                    if (p.kind === 'fog') fade = 0.22 + 0.78 * base;
                                    else fade = base * base;
                                }
                            }
                            if (season === 'autumn' && p.kind === 'leaf' && p.y >= geom.h - 12) {
                                const cap = (vfxLevel === 'low' || degraded) ? 80 : 180;
                                const height = Math.min(140, 30 + (pile?.length || 0) * 0.42);
                                const landed = {
                                    ...p,
                                    x: p.x + (rng() - 0.5) * 34,
                                    y: geom.h - 10 - rng() * height,
                                    alpha: Math.min(0.30, (p.alpha || 0.18) * 1.05)
                                };
                                drawSeasonParticle(ctx, season, landed, t, fade * (intensity ?? 1));
                                pile = [...(pile || []), landed].slice(-cap);
                                continue;
                            }
                            drawSeasonParticle(ctx, season, p, t, fade * (intensity ?? 1));
                            nextParticles.push(p);
                        }
                    }
                    particles = nextParticles;
                    const nextRipples = [];
                    for (const r of ripples) {
                        if (drawRipple(ctx, r, t)) nextRipples.push(r);
                    }
                    return { particles, ripples: nextRipples, pile };
                };

                const loop = (t) => {
                    const dt = Math.max(1, Math.min(48, t - last));
                    last = t;
                    fpsSamples.push(1000 / dt);
                    if (fpsSamples.length > 50) fpsSamples.shift();
                    const fpsAvg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
                    if (!degraded && fpsSamples.length >= 30 && fpsAvg < 30) {
                        degraded = true;
                        setVfxLevel('low');
                    }

                    const canvasRect = canvasA.getBoundingClientRect();
                    const textEl = activeTextRef.current;
                    const textRect = textEl ? textEl.getBoundingClientRect() : null;
                    const mobile = viewportProfile?.mode === 'mobile-portrait';
                    const clearZone = textRect ? {
                        x: (textRect.left + textRect.right) / 2 - canvasRect.left,
                        y: (textRect.top + textRect.bottom) / 2 - canvasRect.top,
                        r: Math.min(340, Math.max(120, Math.max(textRect.width, textRect.height) / 2 + (mobile ? 70 : 110)))
                    } : null;
                    let breath = 1;
                    if (isSeasonTransitioning) {
                        const start = seasonTransitionStartRef.current || t;
                        const p = Math.max(0, Math.min(1, (t - start) / 1400));
                        if (p < 0.1429) {
                            const u = p / 0.1429;
                            const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                            breath = 1 - 0.32 * e;
                        } else if (p > 0.7143) {
                            const u = (p - 0.7143) / (1 - 0.7143);
                            const e = 1 - Math.pow(1 - u, 3);
                            breath = 0.88 + 0.18 * e;
                        }
                    }
                    const a = tickLayer(activeSeason, geomA, geomA.ctx, particlesA, ripplesA, pileA, rngA, dt, t, clearZone, breath);
                    particlesA = a.particles;
                    ripplesA = a.ripples;
                    pileA = a.pile;

                    const seasonB = isSeasonTransitioning ? transitionSeason : null;
                    const b = tickLayer(seasonB, geomB, geomB.ctx, particlesB, ripplesB, pileB, rngB, dt, t, clearZone, breath);
                    particlesB = b.particles;
                    ripplesB = b.ripples;
                    pileB = b.pile;

                    raf = window.requestAnimationFrame(loop);
                };

                const shouldRun = (activeSeason || (isSeasonTransitioning && transitionSeason)) && vfxLevel !== 'off';
                if (shouldRun) raf = window.requestAnimationFrame(loop);

                return () => {
                    window.removeEventListener('resize', onResize);
                    if (raf) window.cancelAnimationFrame(raf);
                    seasonVfxRef.current = null;
                };
            }, [activeSeason, transitionSeason, isSeasonTransitioning, reducedMotion, vfxLevel, viewportProfile]);

            React.useEffect(() => {
                if (!tracks.length && currentTrackIndex !== -1) {
                    setCurrentTrackIndex(-1);
                    return;
                }
                if (tracks.length && currentTrackIndex >= tracks.length) {
                    setCurrentTrackIndex(tracks.length - 1);
                }
            }, [tracks, currentTrackIndex]);

            React.useEffect(() => {
                if (!comments.length) return;
                if (currentIndex >= comments.length) {
                    setCurrentIndex(Math.max(0, comments.length - 1));
                }
            }, [comments, currentIndex]);

            // 首次显示第一句话
            React.useEffect(() => {
                if (comments.length > 0 && activeTextRef.current) {
                    gsap.to(activeTextRef.current, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        duration: 2,
                        ease: "power3.out"
                    });
                }
            }, [comments]);

            // 触发翻页逻辑
            const handleNext = React.useCallback(() => {
                if (isAnimating || comments.length === 0) return;
                setIsAnimating(true);

                const currentText = comments[currentIndex];
                
                // 1. 将当前文字丢落为便签
                const newNote = {
                    id: Date.now() + Math.random(),
                    text: currentText,
                    theme: THEMES[Math.floor(Math.random() * THEMES.length)],
                    fontClass: FONT_PRESETS[Math.floor(Math.random() * FONT_PRESETS.length)],
                    tags: [],
                    pos: getRandomNotePos()
                };
                
                setDroppedNotes(prev => [...prev, newNote]);

                // 2. 主动效：中心文字消失
                gsap.to(activeTextRef.current, {
                    opacity: 0,
                    y: -40,
                    scale: 1.1,
                    filter: 'blur(10px)',
                    duration: 1.5,
                    ease: "power2.inOut",
                    onComplete: () => {
                        // 切换索引
                        const nextIdx = (currentIndex + 1) % comments.length;
                        setCurrentIndex(nextIdx);
                        
                        // 重置位置准备入场
                        gsap.set(activeTextRef.current, {
                            y: 40,
                            scale: 0.9,
                            filter: 'blur(10px)'
                        });

                        // 3. 下一句话入场
                        gsap.to(activeTextRef.current, {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            filter: 'blur(0px)',
                            duration: 2,
                            ease: "power3.out",
                            delay: 0.5, // 留一点呼吸感
                            onComplete: () => {
                                setIsAnimating(false);
                                wheelAcc.current = 0; // 重置滚轮累计
                                autoReadLastTickRef.current = performance.now();
                            }
                        });
                    }
                });
            }, [isAnimating, comments, currentIndex]);

            const handlePrev = React.useCallback(() => {
                if (isAnimating || comments.length === 0) return;
                setIsAnimating(true);

                gsap.to(activeTextRef.current, {
                    opacity: 0,
                    y: 40,
                    scale: 1.06,
                    filter: 'blur(10px)',
                    duration: 1.3,
                    ease: "power2.inOut",
                    onComplete: () => {
                        const prevIdx = (currentIndex - 1 + comments.length) % comments.length;
                        setCurrentIndex(prevIdx);

                        gsap.set(activeTextRef.current, {
                            y: -40,
                            scale: 0.92,
                            filter: 'blur(10px)'
                        });

                        gsap.to(activeTextRef.current, {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            filter: 'blur(0px)',
                            duration: 1.8,
                            ease: "power3.out",
                            delay: 0.35,
                            onComplete: () => {
                                setIsAnimating(false);
                                wheelAcc.current = 0;
                                autoReadLastTickRef.current = performance.now();
                            }
                        });
                    }
                });
            }, [isAnimating, comments, currentIndex]);

            // 监听全局滚轮和触摸滑动
            React.useEffect(() => {
                const handleWheel = (e) => {
                    if (isAnimating || isModalOpen || isDirectoryOpen) return;
                    e.preventDefault();

                    const fn = window.AmbientDreamUtils?.accumulateWheelNavigation;
                    if (typeof fn === 'function') {
                        const next = fn({ acc: wheelAcc.current, deltaY: e.deltaY, threshold: 300 });
                        wheelAcc.current = next.acc;
                        if (next.action === 'next') handleNext();
                        if (next.action === 'prev') handlePrev();
                        return;
                    }

                    wheelAcc.current += e.deltaY;
                    if (wheelAcc.current > 300) handleNext();
                    if (wheelAcc.current < -300) handlePrev();
                };

                let touchStartY = 0;
                const handleTouchStart = (e) => {
                    touchStartY = e.touches[0].clientY;
                };
                const handleTouchMove = (e) => {
                    if (isAnimating || isModalOpen || isDirectoryOpen) return;
                    e.preventDefault();
                    const deltaY = touchStartY - e.touches[0].clientY;
                    if (deltaY > 60) {
                        handleNext();
                        touchStartY = e.touches[0].clientY;
                        return;
                    }
                    if (deltaY < -60) {
                        handlePrev();
                        touchStartY = e.touches[0].clientY;
                    }
                };

                window.addEventListener('wheel', handleWheel, { passive: false });
                window.addEventListener('touchstart', handleTouchStart, { passive: false });
                window.addEventListener('touchmove', handleTouchMove, { passive: false });

                return () => {
                    window.removeEventListener('wheel', handleWheel);
                    window.removeEventListener('touchstart', handleTouchStart);
                    window.removeEventListener('touchmove', handleTouchMove);
                };
            }, [isAnimating, isModalOpen, isDirectoryOpen, currentIndex, comments.length, handleNext, handlePrev]);

            const upsertPalette = React.useCallback((name, color) => {
                const normalized = normalizeTagName(name);
                if (!normalized) return;
                const lower = normalized.toLowerCase();
                setTagPalette(prev => {
                    const now = Date.now();
                    const existing = prev.find(t => String(t?.name || '').toLowerCase() === lower);
                    if (existing) {
                        return prev.map(t => String(t?.name || '').toLowerCase() === lower ? { ...t, color: color || t.color, updatedAt: now } : t);
                    }
                    const nextColor = color || pickTagColor(normalized);
                    return [{ name: normalized, color: nextColor, updatedAt: now }, ...prev].slice(0, 60);
                });
            }, []);

            const normalizeTags = React.useCallback((input) => {
                if (!input) return [];
                const arr = Array.isArray(input) ? input : [input];
                const normalized = arr
                    .map(item => typeof item === 'string' ? { name: item } : item)
                    .map(item => ({ name: normalizeTagName(item?.name), color: item?.color }))
                    .filter(item => item.name);
                const seen = new Set();
                const result = [];
                normalized.forEach(item => {
                    const key = item.name.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    const color = item.color || tagPalette.find(t => String(t?.name || '').toLowerCase() === key)?.color || pickTagColor(item.name);
                    result.push({ name: item.name, color });
                    upsertPalette(item.name, color);
                });
                return result;
            }, [tagPalette, upsertPalette]);

            const notesMigratedRef = React.useRef(false);
            React.useEffect(() => {
                if (notesMigratedRef.current) return;
                notesMigratedRef.current = true;
                let changed = false;
                const next = (Array.isArray(droppedNotes) ? droppedNotes : []).map(note => {
                    if (!note || typeof note !== 'object') return note;
                    if (Array.isArray(note.tags)) {
                        const nextTags = normalizeTags(note.tags);
                        if (JSON.stringify(nextTags) !== JSON.stringify(note.tags)) changed = true;
                        return { ...note, tags: nextTags };
                    }
                    const legacy = normalizeTagName(note.tag);
                    if (!legacy) return { ...note, tags: [] };
                    const legacyTags = normalizeTags([{ name: legacy }]);
                    changed = true;
                    const { tag, ...rest } = note;
                    return { ...rest, tags: legacyTags };
                });
                if (changed) setDroppedNotes(next);
            }, []);

            // 添加自定义便签
            const handleAddCustomNote = (text, theme, fontClass, tags) => {
                const newNote = {
                    id: Date.now() + Math.random(),
                    text: text,
                    theme: theme,
                    fontClass: fontClass || 'font-serif',
                    tags: normalizeTags(tags),
                    pos: getRandomNotePos()
                };
                pushHistory();
                setDroppedNotes(prev => [...prev, newNote]);
            };

            const clearAllNotes = () => {
                if (droppedNotes.length) pushHistory();
                setDroppedNotes([]);
                setFocusedNoteId(null);
            };

            const deleteFocusedNote = () => {
                if (focusedNoteId == null) return;
                pushHistory();
                setDroppedNotes(prev => prev.filter(note => note.id !== focusedNoteId));
                setFocusedNoteId(null);
            };

            const arrangeNotes = () => {
                if (droppedNotes.length) pushHistory();
                const cols = arrangeMetrics.cols;
                const pageSize = arrangeMetrics.pageSize;
                const cardWidth = arrangeMetrics.cardWidth;
                const gapX = arrangeMetrics.gapX;
                const gapY = arrangeMetrics.gapY;
                const topOffset = arrangeMetrics.topOffset;
                const cardHeight = arrangeMetrics.cardHeight;
                const xStart = (() => {
                    const fn = window.AmbientDreamUtils?.getArrangeXStart;
                    if (typeof fn === 'function') {
                        return fn({ viewportWidth: viewportProfile.width, cols, cardWidth, gapX, margin: 18 });
                    }
                    const gridWidth = cols * cardWidth + (cols - 1) * gapX;
                    return Math.max(18, Math.round((viewportProfile.width - gridWidth) / 2));
                })();
                setFocusedNoteId(null);
                setArrangeMode(true);
                setArrangeGroupKey(null);
                setArrangeGroupPageIndex(0);
                setDroppedNotes(prev => prev.map((note, index) => {
                    const localIndex = index % pageSize;
                    const col = localIndex % cols;
                    const row = Math.floor(localIndex / cols);
                    return {
                        ...note,
                        pos: {
                            x: xStart + col * (cardWidth + gapX),
                            y: topOffset + row * (cardHeight + gapY),
                            rot: (col - 1) * 2
                        }
                    };
                }));
            };

            React.useEffect(() => {
                const onKeyDown = (e) => {
                    const tag = e.target?.tagName;
                    const isEditing = tag === 'TEXTAREA' || tag === 'INPUT';

                    if (e.key === 'Tab' && !isEditing && !isModalOpen && !isDirectoryOpen) {
                        e.preventDefault();
                        setMode(prev => {
                            const next = prev === 'reading' ? 'editing' : 'reading';
                            pushToast(next === 'editing' ? '编辑模式' : '阅读模式');
                            return next;
                        });
                        return;
                    }

                    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !isEditing) {
                        e.preventDefault();
                        undo();
                        return;
                    }

                    if (e.key === 'Escape') {
                        if (isModalOpen) {
                            setIsModalOpen(false);
                            return;
                        }
                        if (isDirectoryOpen) {
                            setIsDirectoryOpen(false);
                            return;
                        }
                        if (arrangeMode) {
                            setArrangeMode(false);
                            setArrangeSearch('');
                        }
                    }

                    if ((e.key === 'Delete' || e.key === 'Backspace') && focusedNoteId != null && !isEditing && !isModalOpen && !isDirectoryOpen) {
                        deleteFocusedNote();
                    }
                };
                window.addEventListener('keydown', onKeyDown);
                return () => window.removeEventListener('keydown', onKeyDown);
            }, [arrangeMode, deleteFocusedNote, focusedNoteId, isDirectoryOpen, isModalOpen, pushToast, undo]);

            React.useEffect(() => {
                let timer = null;
                let dragging = false;
                let start = null;
                const clear = () => {
                    if (timer) {
                        window.clearTimeout(timer);
                        timer = null;
                    }
                    dragging = false;
                    start = null;
                    seasonVfxRef.current?.clearDisturb?.();
                };
                const onPointerDown = (e) => {
                    if (isModalOpen || isDirectoryOpen) return;
                    const t = e.target;
                    const path = (typeof e.composedPath === 'function') ? e.composedPath() : null;
                    const isBlocked = (() => {
                        if (t && typeof t.closest === 'function') {
                            return !!t.closest('.memory-note, .controls, .music-dock, .favorites-panel, .modal-overlay');
                        }
                        if (Array.isArray(path)) {
                            for (const n of path) {
                                if (!n || !n.classList) continue;
                                if (
                                    n.classList.contains('memory-note') ||
                                    n.classList.contains('controls') ||
                                    n.classList.contains('music-dock') ||
                                    n.classList.contains('favorites-panel') ||
                                    n.classList.contains('modal-overlay')
                                ) return true;
                            }
                        }
                        return false;
                    })();
                    if (isBlocked) return;
                    clear();
                    seasonVfxRef.current?.addRipple?.(e.clientX, e.clientY);
                    dragging = true;
                    start = { x: e.clientX, y: e.clientY };
                    seasonVfxRef.current?.setDisturb?.(e.clientX, e.clientY);
                    timer = window.setTimeout(() => {
                        setMode(prev => {
                            const next = prev === 'reading' ? 'editing' : 'reading';
                            pushToast(next === 'editing' ? '编辑模式' : '阅读模式');
                            return next;
                        });
                    }, 600);
                };
                const onPointerMove = (e) => {
                    if (!dragging) return;
                    if (timer && start) {
                        const dx = e.clientX - start.x;
                        const dy = e.clientY - start.y;
                        if ((dx * dx + dy * dy) > 64) {
                            window.clearTimeout(timer);
                            timer = null;
                        }
                    }
                    seasonVfxRef.current?.setDisturb?.(e.clientX, e.clientY);
                };
                window.addEventListener('pointerdown', onPointerDown, { passive: true });
                window.addEventListener('pointermove', onPointerMove, { passive: true });
                window.addEventListener('pointerup', clear, { passive: true });
                window.addEventListener('pointercancel', clear, { passive: true });
                return () => {
                    window.removeEventListener('pointerdown', onPointerDown);
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', clear);
                    window.removeEventListener('pointercancel', clear);
                    clear();
                };
            }, [isDirectoryOpen, isModalOpen, pushToast]);

            const handleMusicUpload = (event) => {
                const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('audio/'));
                if (!files.length) return;
                Promise.all(files.map(async (file) => {
                    const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
                    const name = file.name.replace(/\.[^/.]+$/, '');
                    const blobKey = `upload-${id}`;
                    await putMusicBlob(blobKey, file);
                    const url = URL.createObjectURL(file);
                    return {
                        id,
                        name,
                        url,
                        blobKey,
                        mimeType: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        source: 'upload'
                    };
                })).then((uploaded) => {
                    setTracks(prev => {
                        const next = [...prev, ...uploaded];
                        if (currentTrackIndex === -1 && next.length) {
                            setCurrentTrackIndex(0);
                        }
                        return next;
                    });
                }).catch(() => pushToast('上传失败：存储空间不足或浏览器限制'));
                event.target.value = '';
            };

            const togglePlayback = () => {
                if (!tracks.length) return;
                audioContextRef.current?.resume?.().catch(() => {});
                if (currentTrackIndex === -1) {
                    setCurrentTrackIndex(0);
                    setIsPlaying(true);
                    return;
                }
                setIsPlaying(prev => !prev);
            };

            const handleSeek = React.useCallback((event) => {
                const audio = audioRef.current;
                const bar = progressRef.current;
                if (!audio || !bar || !audio.duration) return;
                const rect = bar.getBoundingClientRect();
                const clientX = event.touches?.[0]?.clientX ?? event.clientX;
                const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
                audio.currentTime = audio.duration * ratio;
                setCurrentTime(audio.currentTime);
                setProgress(ratio * 100);
            }, []);

            const beginSeekPointerDrag = React.useCallback((event) => {
                const audio = audioRef.current;
                const bar = progressRef.current;
                if (!audio || !bar || !audio.duration) return;
                event.preventDefault();
                try {
                    bar.setPointerCapture?.(event.pointerId);
                } catch {}
                handleSeek(event);
                const move = (moveEvent) => handleSeek(moveEvent);
                const end = () => {
                    bar.removeEventListener('pointermove', move);
                    bar.removeEventListener('pointerup', end);
                    bar.removeEventListener('pointercancel', end);
                    try {
                        bar.releasePointerCapture?.(event.pointerId);
                    } catch {}
                };
                seekCleanupRef.current?.();
                seekCleanupRef.current = end;
                bar.addEventListener('pointermove', move);
                bar.addEventListener('pointerup', end);
                bar.addEventListener('pointercancel', end);
            }, [handleSeek]);

            const beginSeekDrag = (event) => {
                event.preventDefault();
                handleSeek(event);
                const move = (moveEvent) => handleSeek(moveEvent);
                const end = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', end);
                    window.removeEventListener('touchmove', move);
                    window.removeEventListener('touchend', end);
                };
                seekCleanupRef.current?.();
                seekCleanupRef.current = end;
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', end);
                window.addEventListener('touchmove', move, { passive: false });
                window.addEventListener('touchend', end);
            };

            React.useEffect(() => {
                return () => {
                    seekCleanupRef.current?.();
                };
            }, []);

            const nextTrack = () => {
                if (!tracks.length) return;
                if (orderMode === 'loop_one') {
                    // 保持当前索引，重新播放
                    setIsPlaying(true);
                    audioRef.current && (audioRef.current.currentTime = 0);
                    return;
                }
                if (orderMode === 'shuffle') {
                    let ni = Math.floor(Math.random() * tracks.length);
                    if (tracks.length > 1 && ni === currentTrackIndex) {
                        ni = (ni + 1) % tracks.length;
                    }
                    setCurrentTrackIndex(ni);
                    setIsPlaying(true);
                    return;
                }
                // 顺序
                const ni = (currentTrackIndex + 1) % tracks.length;
                setCurrentTrackIndex(ni);
                setIsPlaying(true);
            };

            const prevTrack = () => {
                if (!tracks.length) return;
                if (orderMode === 'shuffle') {
                    let ni = Math.floor(Math.random() * tracks.length);
                    if (tracks.length > 1 && ni === currentTrackIndex) {
                        ni = (ni + tracks.length - 1) % tracks.length;
                    }
                    setCurrentTrackIndex(ni);
                    setIsPlaying(true);
                    return;
                }
                const pi = (currentTrackIndex - 1 + tracks.length) % tracks.length;
                setCurrentTrackIndex(pi);
                setIsPlaying(true);
            };

            const cycleOrderMode = () => {
                setOrderMode(m => m === 'sequential' ? 'loop_one' : m === 'loop_one' ? 'shuffle' : 'sequential');
            };

            const moveTrack = (index, dir) => {
                setTracks(prev => {
                    const a = [...prev];
                    const ni = index + dir;
                    if (ni < 0 || ni >= a.length) return prev;
                    const tmp = a[index];
                    a[index] = a[ni];
                    a[ni] = tmp;
                    // 调整当前索引
                    if (currentTrackIndex === index) setCurrentTrackIndex(ni);
                    else if (currentTrackIndex === ni) setCurrentTrackIndex(index);
                    return a;
                });
            };

            const removeTrack = (index) => {
                setTracks(prev => {
                    const a = [...prev];
                    const removed = a[index];
                    a.splice(index,1);
                    if (!a.length) {
                        setCurrentTrackIndex(-1);
                        setIsPlaying(false);
                    } else if (index === currentTrackIndex) {
                        setCurrentTrackIndex(index % a.length);
                    } else if (index < currentTrackIndex) {
                        setCurrentTrackIndex(currentTrackIndex - 1);
                    }
                    if (removed && removed.source === 'upload') {
                        if (removed.url && String(removed.url).startsWith('blob:')) {
                            try { URL.revokeObjectURL(removed.url); } catch {}
                        }
                        if (removed.blobKey) {
                            deleteMusicBlob(String(removed.blobKey)).catch(() => {});
                        }
                    }
                    return a;
                });
            };

            const playAt = (index) => {
                if (index < 0 || index >= tracks.length) return;
                setCurrentTrackIndex(index);
                setIsPlaying(true);
            };

            // 收藏当前句子
            const addFavorite = () => {
                const t = comments[currentIndex] || '';
                if (!t) return;
                setFavorites(prev => prev.includes(t) ? prev : [t, ...prev].slice(0, 50));
                setFavoritesOpen(true);
            };

            const jumpToFavorite = (t) => {
                const i = comments.indexOf(t);
                if (i >= 0) {
                    // 直接切换中心文案（不丢动画节奏）
                    if (!isAnimating) {
                        setIsAnimating(true);
                        gsap.to(activeTextRef.current, {
                            opacity: 0, y: -30, scale: 1.04, filter: 'blur(8px)', duration: 1.2, ease: "power2.inOut",
                            onComplete: () => {
                                setCurrentIndex(i);
                                gsap.set(activeTextRef.current, { y: 30, scale: .96, filter: 'blur(8px)' });
                                gsap.to(activeTextRef.current, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: "power3.out",
                                    onComplete: () => setIsAnimating(false)
                                });
                            }
                        });
                    }
                }
            };

            const jumpToRandomFavorite = () => {
                if (!favorites.length) return;
                const i = Math.floor(Math.random() * favorites.length);
                jumpToFavorite(favorites[i]);
            };

            const handleReunionClick = () => {
                if (favorites.length) {
                    setReunionNudgeOpen(false);
                    jumpToRandomFavorite();
                    return;
                }
                setReunionNudgeOpen(true);
                window.clearTimeout(reunionNudgeTimerRef.current);
                reunionNudgeTimerRef.current = window.setTimeout(() => setReunionNudgeOpen(false), 3600);
            };

            const exportBackup = React.useCallback(() => {
                const payload = {
                    version: 2,
                    exportedAt: new Date().toISOString(),
                    comments,
                    droppedNotes,
                    favorites,
                    mode,
                    tagPalette,
                    settings: {
                        volume,
                        orderMode,
                        currentTrackIndex
                    },
                    music: {
                        tracks
                    }
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `ambient-dream-backup-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
            }, [comments, droppedNotes, favorites, mode, orderMode, currentTrackIndex, tagPalette, tracks, volume]);

            const importBackup = React.useCallback((payload) => {
                if (!payload || typeof payload !== 'object') {
                    pushToast('备份导入失败：文件格式不正确');
                    return;
                }
                const nextComments = Array.isArray(payload.comments) ? payload.comments.map(String) : null;
                const nextNotes = Array.isArray(payload.droppedNotes) ? payload.droppedNotes : null;
                const nextFavorites = Array.isArray(payload.favorites) ? payload.favorites.map(String) : null;
                if (!nextComments || !nextNotes) {
                    pushToast('备份导入失败：缺少必要字段');
                    return;
                }
                pushHistory();
                const cleanedNotes = nextNotes
                    .filter(note => note && (typeof note.id === 'number' || typeof note.id === 'string') && typeof note.text === 'string' && note.pos && Number.isFinite(note.pos.x) && Number.isFinite(note.pos.y))
                    .map(note => ({
                        id: note.id,
                        text: note.text,
                        theme: THEMES.includes(note.theme) ? note.theme : THEMES[0],
                        fontClass: FONT_PRESETS.includes(note.fontClass) ? note.fontClass : 'font-serif',
                        tags: normalizeTags(note.tags || note.tag || []),
                        pos: { x: note.pos.x, y: note.pos.y, rot: Number.isFinite(note.pos.rot) ? note.pos.rot : 0 }
                    }));
                setComments(nextComments.filter(Boolean));
                setDroppedNotes(cleanedNotes);
                setFavorites(nextFavorites || []);
                if (payload.mode === 'reading' || payload.mode === 'editing') setMode(payload.mode);
                if (Array.isArray(payload.tagPalette)) {
                    const cleanedPalette = payload.tagPalette
                        .filter(t => t && typeof t.name === 'string')
                        .map(t => ({
                            name: normalizeTagName(t.name),
                            color: typeof t.color === 'string' ? t.color : pickTagColor(t.name),
                            updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : Date.now()
                        }))
                        .filter(t => t.name);
                    setTagPalette(cleanedPalette.slice(0, 60));
                }
                if (payload.settings && typeof payload.settings === 'object') {
                    if (Number.isFinite(payload.settings.volume)) setVolume(Math.min(Math.max(payload.settings.volume, 0), 1));
                    if (payload.settings.orderMode === 'sequential' || payload.settings.orderMode === 'loop_one' || payload.settings.orderMode === 'shuffle') setOrderMode(payload.settings.orderMode);
                    if (Number.isFinite(payload.settings.currentTrackIndex)) setCurrentTrackIndex(payload.settings.currentTrackIndex);
                }
                if (payload.music && Array.isArray(payload.music.tracks)) {
                    const incomingTracks = payload.music.tracks
                        .filter(tr => tr && typeof tr.url === 'string' && typeof tr.name === 'string')
                        .map(tr => ({
                            id: tr.id || `${tr.name}-${Date.now()}-${Math.random()}`,
                            name: tr.name,
                            url: tr.url,
                            source: tr.source || 'import'
                        }));
                    setTracks(incomingTracks);
                }
                setArrangeMode(false);
                setArrangeGroupKey(null);
                setArrangeGroupPageIndex(0);
                setFocusedNoteId(null);
                pushToast('备份已导入');
            }, [normalizeTags, pushToast, pushHistory]);

            const chapterInfo = React.useMemo(() => {
                const currentText = comments[currentIndex] || '';
                if (!currentText) return { stage: 'STAGE', copy: '加载中', aside: '青春有时候只是把一句喜欢放得更轻一点。', mood: 'soft' };
                const earlyHits = /粉笔|教室|窗外|纸飞机|晚自习|课桌|夏天/.test(currentText);
                const midnightHits = /大海|梦|耳机|海风|夜|宇宙|心底/.test(currentText);
                const lateHits = /晚霞|黄昏|时光|分别|落下/.test(currentText);
                if (earlyHits) {
                    return {
                        stage: 'EARLY SUMMER',
                        copy: '在粉笔灰与风铃里，第一次学会把一句话藏到很晚。',
                        aside: '像放学路上并肩走着，却谁也舍不得先说破。',
                        mood: 'school'
                    };
                }
                if (midnightHits) {
                    return {
                        stage: 'MIDSUMMER NIGHT',
                        copy: '我们把未说出的名字交给海风，等潮水退去时再找。',
                        aside: '喜欢在耳机里绕了一圈，回来时已经比夜色更轻。',
                        mood: 'night'
                    };
                }
                if (lateHits) {
                    return {
                        stage: 'LATE LIGHT',
                        copy: '分别那天的夕阳很慢，于是我决定把黄昏收藏起来。',
                        aside: '不是所有告别都响亮，有些只是把手放慢了一点。',
                        mood: 'sunset'
                    };
                }
                return {
                    stage: currentIndex < comments.length * 0.5 ? 'EARLY SUMMER' : 'LATE LIGHT',
                    copy: currentIndex < comments.length * 0.5 ? '风和心事都还很轻，适合把喜欢写得含蓄一点。' : '时间把故事推远了，但那份柔软还停在原地。',
                    aside: '你没回头，但那一刻的空气替你停了一会儿。',
                    mood: 'soft'
                };
            }, [currentIndex, comments]);

            const loveAside = React.useMemo(() => {
                const moodLines = {
                    school: [
                        '有些喜欢，不说破，刚好能陪一个夏天。',
                        '再慢一点读，就像晚自习后一起走回家。'
                    ],
                    night: [
                        '风吹过来时，像有人替我轻轻回答了你。',
                        '耳机里的副歌绕回来，刚好碰见心跳最慢的地方。'
                    ],
                    sunset: [
                        '你没回头，但黄昏替你停了一会儿。',
                        '我把想说的话放进晚霞里，让天色替我保密。'
                    ],
                    soft: [
                        '喜欢有时候不需要证据，只需要一阵风记得。',
                        '我把心事写得很轻，只怕惊动了你。'
                    ]
                };
                const lines = moodLines[chapterInfo.mood] || moodLines.soft;
                return lines[currentIndex % lines.length];
            }, [currentIndex, chapterInfo]);

            const toggleNoteFocus = React.useCallback((noteId) => {
                setFocusedNoteId(prev => prev === noteId ? null : noteId);
            }, []);

            const visibleNotes = arrangeMode ? arrangedNotes : droppedNotes;
            const showArrangeTools = uiProfile === 'classic' || arrangePanelOpen;

            const arrangeLayout = React.useMemo(() => {
                if (!arrangeMode) return null;
                const cols = arrangeMetrics.cols;
                const cardWidth = arrangeMetrics.cardWidth;
                const gapX = arrangeMetrics.gapX;
                const gapY = arrangeMetrics.gapY;
                const topOffset = arrangeMetrics.topOffset;
                const cardHeight = arrangeMetrics.cardHeight;
                const fn = window.AmbientDreamUtils?.getArrangeXStart;
                const xStart = typeof fn === 'function'
                    ? fn({ viewportWidth: viewportProfile.width, cols, cardWidth, gapX, margin: 18 })
                    : Math.max(18, Math.round((viewportProfile.width - (cols * cardWidth + (cols - 1) * gapX)) / 2));
                return { cols, cardWidth, cardHeight, gapX, gapY, topOffset, xStart };
            }, [arrangeMode, arrangeMetrics, viewportProfile.width]);

            const getArrangeDisplayPos = React.useCallback((index) => {
                if (!arrangeLayout) return null;
                const col = index % arrangeLayout.cols;
                const row = Math.floor(index / arrangeLayout.cols);
                const center = (arrangeLayout.cols - 1) / 2;
                return {
                    x: arrangeLayout.xStart + col * (arrangeLayout.cardWidth + arrangeLayout.gapX),
                    y: arrangeLayout.topOffset + row * (arrangeLayout.cardHeight + arrangeLayout.gapY),
                    rot: (col - center) * 2
                };
            }, [arrangeLayout]);

            const handleArrangeToggle = () => {
                if (mode !== 'editing') {
                    setMode('editing');
                    window.setTimeout(() => {
                        if (arrangeMode) exitArrangeMode();
                        else arrangeNotes();
                    }, 0);
                    return;
                }
                if (arrangeMode) exitArrangeMode();
                else arrangeNotes();
            };

            const exitArrangeMode = () => {
                setArrangeMode(false);
                setArrangeSearch('');
                setArrangeGroupKey(null);
                setArrangeGroupPageIndex(0);
                setArrangePanelOpen(false);
            };

            const prevArrangeLayer = () => {
                setArrangeGroupPageIndex(prev => Math.max(0, prev - 1));
            };

            const nextArrangeLayer = () => {
                setArrangeGroupPageIndex(prev => Math.min(Math.max(0, totalLayers - 1), prev + 1));
            };

            const handleNoteMoveEnd = React.useCallback((noteId, pos) => {
                pushHistory();
                setDroppedNotes(prev => prev.map(note => note.id === noteId ? { ...note, pos: { ...note.pos, ...pos } } : note));
            }, [pushHistory]);

            const mobileOnboardingActive = isMobile && mobileOnboardingPhase != null;
            const mainStageClassName = [
                'main-stage',
                `viewport-${viewportProfile.mode}`,
                `mode-${mode}`,
                `ui-${uiProfile}`,
                `season-${(isSeasonTransitioning ? transitionSeason : activeSeason) || 'base'}`,
                isMobile ? 'viewport-mobile' : '',
                isMobilePortrait ? 'viewport-mobile-portrait' : '',
                mobileDockExpanded ? 'mobile-dock-expanded' : '',
                mobileOnboardingActive ? `mobile-onboarding onboard-${mobileOnboardingPhase}` : ''
            ].filter(Boolean).join(' ');
            const mainStageStyle = isMobile ? { '--mobile-controls-h': `${mobileControlsHeight}px` } : undefined;

            return (
                <div className={mainStageClassName} style={mainStageStyle}>
                    <AmbientBackground bgRef={ambientBgRef} />
                    <div ref={seasonStageRef} className={`season-stage ${(activeSeason != null || transitionSeason != null) ? 'active' : ''}`} aria-hidden="true">
                        <div className={`season-layer season-layer-far season-far ${activeSeason || ''} ${(activeSeason && !isSeasonTransitioning) ? 'is-active' : ''}`}></div>
                        <div className={`season-layer season-layer-mid season-mid ${activeSeason || ''} ${(activeSeason && !isSeasonTransitioning) ? 'is-active' : ''}`}></div>
                        <canvas ref={seasonCanvasRef} className={`season-canvas ${(activeSeason && !isSeasonTransitioning) ? 'is-active' : ''}`}></canvas>
                        <div className={`season-layer season-layer-far season-far ${transitionSeason || ''} ${isSeasonTransitioning ? 'is-active' : ''}`}></div>
                        <div className={`season-layer season-layer-mid season-mid ${transitionSeason || ''} ${isSeasonTransitioning ? 'is-active' : ''}`}></div>
                        <canvas ref={seasonCanvasNextRef} className={`season-canvas season-canvas-next ${isSeasonTransitioning ? 'is-active' : ''}`}></canvas>
                    </div>
                    <div className="noise-overlay"></div>
                    
                    {/* 掉落层 */}
                    <div className={`notes-layer ${arrangeMode ? 'arranged' : ''}`}>
                        {visibleNotes.map((note, index) => (
                            <MemoryNote 
                                key={note.id} 
                                id={note.id}
                                text={note.text} 
                                theme={note.theme} 
                                fontClass={note.fontClass}
                                tags={note.tags}
                                initialPos={arrangeMode ? (getArrangeDisplayPos(index) || note.pos) : note.pos} 
                                isFocused={focusedNoteId === note.id}
                                onFocus={toggleNoteFocus}
                                onMoveEnd={handleNoteMoveEnd}
                            />
                        ))}
                    </div>

                    {/* 中心活跃层 */}
                    <div className="active-text-container">
                        <div 
                            ref={activeTextRef} 
                            className="active-text"
                            style={{ opacity: 0, transform: 'translateY(40px) scale(0.9)', filter: 'blur(10px)' }}
                        >
                            {comments.length > 0 ? comments[currentIndex] : "加载中..."}
                        </div>
                    </div>

                    <div className={`bottom-center-stack ${mobileOnboardingPhase === 'scroll' ? 'onboard-focus' : ''}`}>
                        <div ref={breathProgressRef} className={`breath-progress ${(isAutoReading && !isUserInteracting) ? 'visible' : ''}`} aria-hidden="true">
                            <div className="breath-line"></div>
                            <div className="breath-dot"></div>
                        </div>
                        <div className="hint">
                            <WhisperText
                                imagery="风在读，你只需要慢一点。"
                                literal="上滑/下滚下一条，下滑/上滚上一条"
                                forceLiteral={isUserInteracting}
                            />
                        </div>
                        <button type="button" className="reunion-btn press-jelly" onClick={handleReunionClick} title={favorites.length ? '随机翻一条收藏' : '先收藏几句，再来相遇'}>
                            再遇见一条
                        </button>
                        {!!reunionNudgeOpen && (
                            <div className="reunion-nudge">
                                <WhisperText
                                    imagery="喜欢的句子，会在这里慢慢聚拢。"
                                    literal="先点一下 ♥，把这句收藏起来。"
                                    forceLiteral={isUserInteracting}
                                    initialMs={1600}
                                />
                            </div>
                        )}
                        <div className="love-side-note">{loveAside}</div>
                    </div>

                    <div
                        className={`music-dock ${(musicDockOpen || musicDockPinned) ? 'expanded' : 'collapsed'} ${mobileOnboardingPhase === 'music' ? 'onboard-focus' : ''}`}
                        onMouseEnter={() => setMusicDockOpen(true)}
                        onMouseLeave={() => !musicDockPinned && setMusicDockOpen(false)}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleMusicUpload}
                        />
                        <div className="music-top">
                            <div className="panel-head">
                                <div className="panel-head-main music-meta" onClick={() => setMusicDockOpen(prev => !prev)}>
                                    <div className="music-label">MUSIC FOR THIS DREAM</div>
                                    <div className="music-name">
                                        {tracks.length
                                            ? (tracks[currentTrackIndex]?.name || '已上传音乐，等待播放')
                                            : '还没有音乐，点击右侧上传'}
                                    </div>
                                </div>
                                <div className="panel-head-tools">
                                    <button
                                        className={`panel-icon-btn music-compact-play ${isPlaying ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!tracks.length) {
                                                pushToast('还没有音乐');
                                                return;
                                            }
                                            togglePlayback();
                                        }}
                                        title={isPlaying ? '暂停' : '播放'}
                                    >
                                        {isPlaying ? '❚❚' : '▶'}
                                    </button>
                                    <button
                                        className={`panel-icon-btn ${musicDockPinned ? 'active' : ''}`}
                                        onClick={() => {
                                            setMusicDockPinned(prev => !prev);
                                            setMusicDockOpen(true);
                                        }}
                                        title="锁定音乐坞"
                                    >
                                        <svg className="pin-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M14 2H10v5l-2 2v3h8V9l-2-2V2z" />
                                            <path d="M12 12v10" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="music-actions">
                                <button className="music-btn" onClick={() => fileInputRef.current?.click()}>
                                    上传音乐
                                </button>
                                <button className="music-btn" onClick={refreshLibraryTracks}>
                                    刷新曲库
                                </button>
                                <button className="music-btn" onClick={togglePlayback}>
                                    {isPlaying ? '暂停' : '播放'}
                                </button>
                            </div>
                        </div>
                        <div className="dock-body">
                            <div className="music-foot">
                                <div className="music-count">{tracks.length ? `已载入 ${tracks.length} 首` : '支持 mp3 / wav / ogg'}</div>
                                <div
                                    ref={progressRef}
                                    className="music-progress"
                                    style={{ '--progress': `${progress}%` }}
                                    onClick={handleSeek}
                                    onPointerDown={beginSeekPointerDrag}
                                >
                                    <span></span>
                                </div>
                                <div className="music-time">{formatTime(currentTime)} / {formatTime(audioRef.current?.duration || 0)}</div>
                                <div className="music-tip">{isPlaying ? `播放进度 ${Math.round(progress)}%` : '静置中'}</div>
                            </div>
                            <div className="music-toolbar">
                                <div className="music-toolbar-left">
                                    <button className="music-mini-btn" onClick={prevTrack}>上一首</button>
                                    <button className="music-mini-btn" onClick={nextTrack}>下一首</button>
                                </div>
                                <div className="music-toolbar-right">
                                    <button className={`music-mini-btn ${orderMode==='sequential'?'active':''}`} onClick={cycleOrderMode}>
                                        {orderMode === 'sequential' ? '顺序' : orderMode === 'loop_one' ? '单曲' : '随机'}
                                    </button>
                                    <div className="volume-wrap">
                                        <span className="volume-label">VOL</span>
                                        <input
                                            className="volume-slider"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={volume}
                                            onChange={(e) => setVolume(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                            {tracks.length > 0 && (
                              <div className="playlist-panel">
                                  {tracks.map((tr, i) => (
                                      <div className={`playlist-row ${i===currentTrackIndex?'active':''}`} key={tr.id}>
                                          <div className="playlist-main" onClick={() => playAt(i)}>
                                              <strong>{tr.name}</strong>
                                              <span>{i===currentTrackIndex ? (isPlaying ? '正在播放' : '已暂停') : '点击播放'}</span>
                                          </div>
                                          <div className="playlist-actions">
                                              <button className="tiny-btn" title="上移" onClick={() => moveTrack(i,-1)}>↑</button>
                                              <button className="tiny-btn" title="下移" onClick={() => moveTrack(i, 1)}>↓</button>
                                              <button className="tiny-btn" title="删除" onClick={() => removeTrack(i)}>✕</button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                            )}
                        </div>
                    </div>

                    {isMobile ? (
                        <div
                            ref={controlsRef}
                            className={`controls mobile-controls ${mode === 'reading' ? 'compact' : ''} ${mobileOnboardingPhase === 'controls' ? 'onboard-focus onboard-expanded' : ''}`}
                        >
                            <button type="button" className="soft-icon-btn" title="收藏当前句子" onClick={addFavorite}>♥</button>
                            <button type="button" className="soft-icon-btn" title="语录目录" onClick={() => {
                                setIsModalOpen(false);
                                setIsDirectoryOpen(true);
                            }}>≡</button>
                            <button type="button" className="soft-icon-btn" title="更多" onClick={() => {
                                if (mobileDockExpanded) return;
                                setMobileMoreOpen(prev => !prev);
                            }}>⋯</button>
                        </div>
                    ) : (
                        <div className={`controls ${mode === 'reading' ? 'compact' : ''}`}>
                            <button type="button" className="soft-icon-btn" title="收藏当前句子" onClick={addFavorite}>♥</button>
                            <button type="button" className="soft-icon-btn label-btn" title="语录目录" onClick={() => {
                                setIsModalOpen(false);
                                setIsDirectoryOpen(true);
                            }}>目录</button>
                            <button type="button" className="soft-icon-btn label-btn" title="自动阅读" onClick={() => setIsAutoReading(prev => !prev)}>
                                {isAutoReading ? '停读' : '自读'}
                            </button>
                            {arrangeMode && mode === 'editing' && uiProfile === 'refined' && (
                                <button
                                    type="button"
                                    className={`music-mini-btn ${arrangePanelOpen ? 'active' : ''}`}
                                    onClick={() => setArrangePanelOpen(prev => !prev)}
                                    title="展开/收起整理面板"
                                >
                                    面板
                                </button>
                            )}
                            {arrangeMode && mode === 'editing' && showArrangeTools && (
                                <div className="arrange-groups-wrap">
                                    <button
                                        type="button"
                                        className={`music-mini-btn ${groupingEnabled ? 'active' : ''}`}
                                        onClick={() => setGroupingEnabled(prev => !prev)}
                                    >
                                        分组
                                    </button>
                                    {groupingEnabled && arrangeGroups.map(g => (
                                        <button
                                            key={g.key || 'all'}
                                            type="button"
                                            className={`music-mini-btn arrange-group-btn ${(currentArrangeGroup?.key ?? null) === (g.key ?? null) ? 'active' : ''}`}
                                            onClick={() => {
                                                setArrangeGroupKey(g.key);
                                                setArrangeGroupPageIndex(0);
                                            }}
                                        >
                                            {!!g.color && <span className="tag-dot" style={{ backgroundColor: g.color }}></span>}
                                            <span>{g.label}</span>
                                            <span className="arrange-search-meta">{g.noteIds.length}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {arrangeMode && mode === 'editing' && showArrangeTools && (
                                <div className="arrange-filter-wrap">
                                    {(tagPalette || []).slice(0, 10).map(t => {
                                        const key = String(t?.name || '').trim().toLowerCase();
                                        if (!key) return null;
                                        const active = selectedTagSet.has(key);
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`music-mini-btn arrange-group-btn ${active ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedTags(prev => {
                                                        const set = new Set((Array.isArray(prev) ? prev : []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean));
                                                        if (set.has(key)) set.delete(key);
                                                        else set.add(key);
                                                        return Array.from(set);
                                                    });
                                                    setArrangeGroupPageIndex(0);
                                                }}
                                            >
                                                {!!t.color && <span className="tag-dot" style={{ backgroundColor: t.color }}></span>}
                                                <span>{t.name}</span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        className={`music-mini-btn ${includeUntagged ? 'active' : ''}`}
                                        onClick={() => {
                                            setIncludeUntagged(prev => !prev);
                                            setArrangeGroupPageIndex(0);
                                        }}
                                    >
                                        未分类
                                    </button>
                                    <button
                                        type="button"
                                        className="music-mini-btn"
                                        onClick={() => {
                                            setSelectedTags([]);
                                            setIncludeUntagged(true);
                                            setArrangeSearch('');
                                            setArrangeGroupPageIndex(0);
                                        }}
                                    >
                                        清空
                                    </button>
                                </div>
                            )}
                            {arrangeMode && mode === 'editing' && showArrangeTools && (
                                <div className="arrange-search-wrap">
                                    <input
                                        className="arrange-search-input"
                                        value={arrangeSearch}
                                        onChange={(e) => setArrangeSearch(e.target.value)}
                                        placeholder="搜索便签内容…"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                locateNextMatch();
                                            }
                                        }}
                                    />
                                    <button type="button" className="music-mini-btn" onClick={locatePrevMatch}>上一个</button>
                                    <button type="button" className="music-mini-btn" onClick={locateNextMatch}>下一个</button>
                                    <div className="arrange-search-meta">
                                        {String(arrangeSearch || '').trim()
                                            ? (arrangeMatches.length ? `${arrangeMatches.length}处` : '无匹配')
                                            : ''}
                                    </div>
                                </div>
                            )}
                            {arrangeMode && mode === 'editing' && (
                                <button type="button" className="soft-icon-btn label-btn" title="上一层" onClick={prevArrangeLayer}>上一层</button>
                            )}
                            {arrangeMode && mode === 'editing' && (
                                <button type="button" className="soft-icon-btn label-btn" title="下一层" onClick={nextArrangeLayer}>下一层</button>
                            )}
                            {arrangeMode && mode === 'editing' && (
                                <div className="soft-icon-btn label-btn" title="当前层">{`${currentArrangeGroup?.label || '全部'} ${arrangeGroupPageIndex + 1}/${totalLayers}`}</div>
                            )}
                            <button type="button" className="soft-icon-btn label-btn" title={arrangeMode ? "退出整理" : "整理便签"} onClick={handleArrangeToggle}>
                                {arrangeMode ? '退出整理' : '整理'}
                            </button>
                            {mode === 'editing' && (
                                <button type="button" className="soft-icon-btn label-btn" title="撤销" onClick={undo}>撤销</button>
                            )}
                            {mode === 'editing' && focusedNoteId != null && (
                                <button type="button" className="soft-icon-btn label-btn" title="编辑标签" onClick={() => setIsTagEditorOpen(true)}>标签</button>
                            )}
                            {mode === 'editing' && (
                                <button type="button" className="soft-icon-btn label-btn" title="清空便签" onClick={clearAllNotes}>清空</button>
                            )}
                            {mode === 'editing' && (
                                <button type="button" className="add-btn" onClick={() => {
                                    setIsDirectoryOpen(false);
                                    setIsModalOpen(true);
                                }}>+</button>
                            )}
                        </div>
                    )}

                    {mobileMoreVisible && (
                        <div className="mobile-more-overlay" onClick={() => setMobileMoreOpen(false)}>
                            <div className="mobile-more-panel" onClick={(e) => e.stopPropagation()}>
                                <div className="mobile-more-grid">
                                    <button type="button" className="mobile-more-btn" onClick={() => {
                                        setIsAutoReading(prev => !prev);
                                        setMobileMoreOpen(false);
                                    }}>{isAutoReading ? '停读' : '自读'}</button>
                                    <button type="button" className="mobile-more-btn" onClick={() => {
                                        handleArrangeToggle();
                                        setMobileMoreOpen(false);
                                    }}>{arrangeMode ? '退出整理' : '整理'}</button>
                                    <button type="button" className="mobile-more-btn" onClick={() => {
                                        setUiProfile(prev => prev === 'classic' ? 'refined' : 'classic');
                                        setMobileMoreOpen(false);
                                    }}>{uiProfile === 'classic' ? '沉浸+' : '经典'}</button>
                                    {mode === 'editing' && (
                                        <button type="button" className="mobile-more-btn" onClick={() => {
                                            undo();
                                            setMobileMoreOpen(false);
                                        }}>撤销</button>
                                    )}
                                    {mode === 'editing' && focusedNoteId != null && (
                                        <button type="button" className="mobile-more-btn" onClick={() => {
                                            setIsTagEditorOpen(true);
                                            setMobileMoreOpen(false);
                                        }}>标签</button>
                                    )}
                                    {mode === 'editing' && (
                                        <button type="button" className="mobile-more-btn" onClick={() => {
                                            clearAllNotes();
                                            setMobileMoreOpen(false);
                                        }}>清空</button>
                                    )}
                                    {mode === 'editing' && (
                                        <button type="button" className="mobile-more-btn" onClick={() => {
                                            setIsDirectoryOpen(false);
                                            setIsModalOpen(true);
                                            setMobileMoreOpen(false);
                                        }}>新增</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="chapter-badge">
                        <div className="stage-name">{chapterInfo.stage}</div>
                        <div className="stage-copy">{chapterInfo.copy}</div>
                        <div className="chapter-subline">{chapterInfo.aside}</div>
                    </div>

                    <div
                        className={`favorites-panel ${(favoritesOpen || favoritesPinned) ? 'expanded' : 'collapsed'}`}
                        onMouseEnter={() => setFavoritesOpen(true)}
                        onMouseLeave={() => !favoritesPinned && setFavoritesOpen(false)}
                    >
                        <div className="favorites-head">
                            <button type="button" className="favorites-head-main" onClick={() => setFavoritesOpen(prev => !prev)}>
                                <div className="favorites-title">{(isMobile && !(favoritesOpen || favoritesPinned)) ? 'FAV' : 'FAVORITES'}</div>
                            </button>
                            {!(isMobile && !(favoritesOpen || favoritesPinned)) && (
                                <button
                                    type="button"
                                    className="profile-toggle-btn"
                                    onClick={() => setUiProfile(prev => prev === 'classic' ? 'refined' : 'classic')}
                                    title="切换界面呈现，不影响内容"
                                >
                                    {uiProfile === 'classic' ? '沉浸+' : '经典'}
                                </button>
                            )}
                            <button
                                type="button"
                                className={`panel-icon-btn ${favoritesPinned ? 'active' : ''}`}
                                onClick={() => {
                                    setFavoritesPinned(prev => !prev);
                                    setFavoritesOpen(true);
                                }}
                                title="锁定收藏夹"
                            >
                                <svg className="pin-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M14 2H10v5l-2 2v3h8V9l-2-2V2z" />
                                    <path d="M12 12v10" />
                                </svg>
                            </button>
                        </div>
                        <div className="favorites-body">
                            {favorites.length ? favorites.map((t, idx) => (
                              <div className="favorite-item" key={idx} onClick={() => jumpToFavorite(t)}>{t}</div>
                            )) : (
                                <div className="favorite-empty">
                                    <WhisperText
                                        imagery="喜欢的句子，会在这里慢慢聚拢。"
                                        literal="把你喜欢的句子收藏在这里。"
                                        forceLiteral={favoritesOpen || favoritesPinned}
                                    />
                                </div>
                            )}
                            {!!favorites.length && (
                                <div className="favorites-actions">
                                    <button className="music-mini-btn" onClick={() => setFavorites([])}>清空收藏</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!!toasts.length && (
                        <div className="toast-stack">
                            {toasts.map(item => (
                                <div key={item.id} className="toast-item">{item.message}</div>
                            ))}
                        </div>
                    )}

                    {/* 模态框 */}
                    <QuoteDirectoryModal
                        isOpen={isDirectoryOpen}
                        comments={comments}
                        viewMode={directoryViewMode}
                        onViewModeChange={setDirectoryViewMode}
                        onExportBackup={exportBackup}
                        onImportBackup={importBackup}
                        onClose={() => setIsDirectoryOpen(false)}
                        onChange={(nextComments) => setComments(nextComments)}
                        onSave={(nextComments) => {
                            setComments(nextComments);
                            setIsDirectoryOpen(false);
                        }}
                    />
                    <TagEditorModal
                        isOpen={isTagEditorOpen}
                        note={focusedNoteId != null ? noteById.get(focusedNoteId) : null}
                        tagPalette={tagPalette}
                        onClose={() => setIsTagEditorOpen(false)}
                        onSave={(nextTags) => {
                            if (focusedNoteId == null) return;
                            pushHistory();
                            setDroppedNotes(prev => prev.map(note => note.id === focusedNoteId ? { ...note, tags: normalizeTags(nextTags) } : note));
                            setIsTagEditorOpen(false);
                        }}
                    />
                    <AddNoteModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        onSubmit={handleAddCustomNote}
                        tagPalette={tagPalette}
                    />
                </div>
            );
        };

        // --- 组件：添加便签的模态框 ---
        const AddNoteModal = ({ isOpen, onClose, onSubmit, tagPalette }) => {
            const [text, setText] = React.useState('');
            const [theme, setTheme] = React.useState(THEMES[0]);
            const [fontClass, setFontClass] = React.useState(FONT_PRESETS[0]);
            const [tagInput, setTagInput] = React.useState('');
            const [tags, setTags] = React.useState([]);

            React.useEffect(() => {
                if (isOpen) {
                    setTagInput('');
                    setTags([]);
                }
            }, [isOpen]);

            const addTagsFromText = (raw) => {
                const parts = String(raw || '').split(/[,\uFF0C]/g).map(s => normalizeTagName(s)).filter(Boolean);
                if (!parts.length) return;
                setTags(prev => {
                    const seen = new Set(prev.map(t => String(t?.name || '').toLowerCase()));
                    const next = [...prev];
                    parts.forEach(name => {
                        const key = name.toLowerCase();
                        if (seen.has(key)) return;
                        const color = (Array.isArray(tagPalette) ? tagPalette : []).find(t => String(t?.name || '').toLowerCase() === key)?.color || pickTagColor(name);
                        next.push({ name, color });
                        seen.add(key);
                    });
                    return next;
                });
            };

            const cycleTagColor = (idx) => {
                setTags(prev => prev.map((t, i) => {
                    if (i !== idx) return t;
                    const current = String(t?.color || '');
                    const list = TAG_COLORS;
                    const at = list.indexOf(current);
                    const next = list[(at + 1 + list.length) % list.length];
                    return { ...t, color: next };
                }));
            };

            const removeTagAt = (idx) => {
                setTags(prev => prev.filter((_, i) => i !== idx));
            };

            const handleSubmit = () => {
                if (text.trim()) {
                    onSubmit(text, theme, fontClass, tags);
                    setText('');
                    setTagInput('');
                    setTags([]);
                    onClose();
                }
            };

            const themeLabels = {
                'theme-glass': '雾面玻璃',
                'theme-abyss': '灰蓝深潭',
                'theme-crimson': '旧玫瑰',
                'theme-holo': '柔雾幻彩',
                'theme-paper': '泛黄信笺',
                'theme-neon': '苔绿打字机',
                'theme-blush': '晚樱粉雾',
                'theme-lavender': '薰衣草夜',
                'theme-pearl': '珍珠奶白',
                'theme-sunset': '杏桃晚霞'
            };

            const fontLabels = {
                'font-serif': '温柔衬线',
                'font-kaiti': '轻柔楷体',
                'font-fangsong': '书页仿宋',
                'font-sans': '清透黑体',
                'font-rounded': '圆润手札'
            };

            return (
                <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
                    <div className="modal-content">
                        <h3>投递你的意识碎片</h3>
                        <div className="modal-subtitle">挑一个更贴近这句心事的颜色和字感，让它落下时像一张真正写给青春的便签。</div>
                        <textarea 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            placeholder="写下你未曾说出口的话..."
                        />
                        <div className="picker-group">
                            <div className="picker-label">标签</div>
                            {!!tags.length && (
                                <div className="note-tags" style={{ marginBottom: 12 }}>
                                    {tags.map((t, idx) => (
                                        <button
                                            type="button"
                                            key={`${t.name}-${idx}`}
                                            className="note-tag-pill"
                                            onClick={() => cycleTagColor(idx)}
                                            title="点击切换颜色"
                                        >
                                            <span className="tag-dot" style={{ backgroundColor: t.color }}></span>
                                            <span className="tag-name">{t.name}</span>
                                            <span style={{ marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); removeTagAt(idx); }}>✕</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input
                                className="modal-input"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="输入标签，回车添加（支持逗号批量）"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTagsFromText(tagInput);
                                        setTagInput('');
                                    }
                                }}
                            />
                            {!!(Array.isArray(tagPalette) ? tagPalette.length : 0) && (
                                <div className="style-selector" style={{ marginTop: -8 }}>
                                    {(tagPalette || []).slice().sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0)).slice(0, 8).map(t => (
                                        <button
                                            type="button"
                                            key={String(t?.name || '')}
                                            className="style-btn"
                                            onClick={() => addTagsFromText(t.name)}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="picker-group">
                            <div className="picker-label">便签色调</div>
                            <div className="style-selector">
                                {THEMES.map(t => (
                                    <button 
                                        key={t}
                                        className={`style-btn theme-preview ${theme === t ? 'selected' : ''}`}
                                        onClick={() => setTheme(t)}
                                    >
                                        {themeLabels[t]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="picker-group">
                            <div className="picker-label">字体气质</div>
                            <div className="style-selector">
                                {FONT_PRESETS.map(font => (
                                    <button 
                                        key={font}
                                        className={`style-btn font-preview ${font} ${fontClass === font ? 'selected' : ''}`}
                                        onClick={() => setFontClass(font)}
                                    >
                                        {fontLabels[font]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="action-btn btn-cancel" onClick={onClose}>取消</button>
                            <button className="action-btn btn-confirm" onClick={handleSubmit}>散落</button>
                        </div>
                    </div>
                </div>
            );
        };

        const TagEditorModal = ({ isOpen, onClose, note, tagPalette, onSave }) => {
            const [tagInput, setTagInput] = React.useState('');
            const [tags, setTags] = React.useState([]);

            React.useEffect(() => {
                if (!isOpen) return;
                const init = Array.isArray(note?.tags) ? note.tags : [];
                const cleaned = init
                    .map(t => ({ name: normalizeTagName(t?.name), color: typeof t?.color === 'string' ? t.color : pickTagColor(t?.name) }))
                    .filter(t => t.name);
                setTags(cleaned);
                setTagInput('');
            }, [isOpen, note]);

            const addTagsFromText = (raw) => {
                const parts = String(raw || '').split(/[,\uFF0C]/g).map(s => normalizeTagName(s)).filter(Boolean);
                if (!parts.length) return;
                setTags(prev => {
                    const seen = new Set(prev.map(t => String(t?.name || '').toLowerCase()));
                    const next = [...prev];
                    parts.forEach(name => {
                        const key = name.toLowerCase();
                        if (seen.has(key)) return;
                        const color = (Array.isArray(tagPalette) ? tagPalette : []).find(t => String(t?.name || '').toLowerCase() === key)?.color || pickTagColor(name);
                        next.push({ name, color });
                        seen.add(key);
                    });
                    return next;
                });
            };

            const cycleTagColor = (idx) => {
                setTags(prev => prev.map((t, i) => {
                    if (i !== idx) return t;
                    const current = String(t?.color || '');
                    const list = TAG_COLORS;
                    const at = list.indexOf(current);
                    const next = list[(at + 1 + list.length) % list.length];
                    return { ...t, color: next };
                }));
            };

            const removeTagAt = (idx) => {
                setTags(prev => prev.filter((_, i) => i !== idx));
            };

            return (
                <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
                    <div className="modal-content">
                        <h3>编辑标签</h3>
                        <div className="modal-subtitle">点击标签可以切换颜色；点 ✕ 删除。</div>
                        {!!tags.length && (
                            <div className="note-tags" style={{ marginBottom: 14 }}>
                                {tags.map((t, idx) => (
                                    <button
                                        type="button"
                                        key={`${t.name}-${idx}`}
                                        className="note-tag-pill"
                                        onClick={() => cycleTagColor(idx)}
                                        title="点击切换颜色"
                                    >
                                        <span className="tag-dot" style={{ backgroundColor: t.color }}></span>
                                        <span className="tag-name">{t.name}</span>
                                        <span style={{ marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); removeTagAt(idx); }}>✕</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            className="modal-input"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="输入标签，回车添加（支持逗号批量）"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addTagsFromText(tagInput);
                                    setTagInput('');
                                }
                            }}
                        />
                        {!!(Array.isArray(tagPalette) ? tagPalette.length : 0) && (
                            <div className="style-selector" style={{ marginTop: -8, marginBottom: 14 }}>
                                {(tagPalette || []).slice().sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0)).slice(0, 12).map(t => (
                                    <button
                                        type="button"
                                        key={String(t?.name || '')}
                                        className="style-btn"
                                        onClick={() => addTagsFromText(t.name)}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="action-btn btn-cancel" onClick={onClose}>取消</button>
                            <button className="action-btn btn-confirm" onClick={() => onSave(tags)}>保存</button>
                        </div>
                    </div>
                </div>
            );
        };

        const QuoteDirectoryModal = ({ isOpen, comments, viewMode, onViewModeChange, onExportBackup, onImportBackup, onClose, onChange, onSave }) => {
            const [drafts, setDrafts] = React.useState(comments);
            const [newQuote, setNewQuote] = React.useState('');
            const [selectedIndex, setSelectedIndex] = React.useState(0);
            const importInputRef = React.useRef(null);

            React.useEffect(() => {
                if (isOpen) {
                    setDrafts(comments);
                    setNewQuote('');
                    setSelectedIndex(0);
                }
            }, [isOpen, comments]);

            const updateDraft = (index, value) => {
                setDrafts(prev => {
                    const next = prev.map((item, idx) => idx === index ? value : item);
                    onChange?.(next.map(item => String(item)));
                    return next;
                });
            };

            const deleteDraft = (index) => {
                setDrafts(prev => {
                    const next = prev.filter((_, idx) => idx !== index);
                    onChange?.(next.map(item => String(item)));
                    setSelectedIndex(s => Math.max(0, Math.min(s, Math.max(0, next.length - 1))));
                    return next;
                });
            };

            const addDraft = () => {
                if (!newQuote.trim()) return;
                setDrafts(prev => {
                    const next = [...prev, newQuote.trim()];
                    onChange?.(next.map(item => String(item)));
                    setSelectedIndex(prev.length);
                    return next;
                });
                setNewQuote('');
            };

            const exportAsFile = (type) => {
                const cleaned = drafts.map(item => item.trim()).filter(Boolean);
                const content = type === 'json'
                    ? JSON.stringify(cleaned, null, 2)
                    : cleaned.join('\n');
                const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = type === 'json' ? 'romantic-quotes.json' : 'romantic-quotes.txt';
                a.click();
                URL.revokeObjectURL(a.href);
            };

            const handleSave = () => {
                onSave(drafts.map(item => item.trim()).filter(Boolean));
            };

            const handleImportBackupFile = (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const payload = JSON.parse(String(reader.result || ''));
                        onImportBackup?.(payload);
                    } catch (e) {
                        onImportBackup?.(null);
                    }
                };
                reader.readAsText(file);
                event.target.value = '';
            };

            return (
                <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
                    <div className="modal-content directory-modal">
                        <h3>语录目录</h3>
                        <div className="modal-subtitle">这里保留所有正在使用的语录。修改会自动保存，你也可以导出/导入备份。</div>
                        <div className="directory-toolbar">
                            <div className="picker-label">当前共 {drafts.length} 句</div>
                            <div className="directory-toolbar-actions">
                                <button className={`music-mini-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => onViewModeChange?.('compact')}>缩略</button>
                                <button className={`music-mini-btn ${viewMode === 'detail' ? 'active' : ''}`} onClick={() => onViewModeChange?.('detail')}>详情</button>
                                <button className="music-mini-btn" onClick={() => exportAsFile('txt')}>导出文本</button>
                                <button className="music-mini-btn" onClick={() => exportAsFile('json')}>导出 JSON</button>
                                <button className="music-mini-btn" onClick={onExportBackup}>导出备份</button>
                                <button className="music-mini-btn" onClick={() => importInputRef.current?.click()}>导入备份</button>
                            </div>
                        </div>
                        <input
                            ref={importInputRef}
                            type="file"
                            accept="application/json"
                            style={{ display: 'none' }}
                            onChange={handleImportBackupFile}
                        />
                        {viewMode === 'compact' ? (
                            <div className="quote-compact">
                                <div className="quote-compact-list">
                                    {drafts.map((quote, index) => (
                                        <button
                                            type="button"
                                            className={`quote-compact-row ${index === selectedIndex ? 'active' : ''}`}
                                            key={`quote-compact-${index}`}
                                            onClick={() => setSelectedIndex(index)}
                                        >
                                            <span className="quote-compact-index">#{String(index + 1).padStart(2, '0')}</span>
                                            <span className="quote-compact-preview">{String(quote || '').trim() || '（空）'}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="quote-compact-detail">
                                    <div className="quote-row-head">
                                        <div className="quote-index">QUOTE {String(selectedIndex + 1).padStart(2, '0')}</div>
                                    </div>
                                    <textarea
                                        value={drafts[selectedIndex] ?? ''}
                                        onChange={(e) => updateDraft(selectedIndex, e.target.value)}
                                        placeholder="写下一句新的语录"
                                    />
                                    <div className="quote-row-actions">
                                        <button className="music-mini-btn" onClick={() => deleteDraft(selectedIndex)}>删除这句</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="quote-list">
                                {drafts.map((quote, index) => (
                                    <div className="quote-row" key={`quote-${index}`}>
                                        <div className="quote-row-head">
                                            <div className="quote-index">QUOTE {String(index + 1).padStart(2, '0')}</div>
                                        </div>
                                        <textarea
                                            value={quote}
                                            onChange={(e) => updateDraft(index, e.target.value)}
                                            placeholder="写下一句新的语录"
                                        />
                                        <div className="quote-row-actions">
                                            <button className="music-mini-btn" onClick={() => deleteDraft(index)}>删除这句</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="new-quote-box">
                            <div className="picker-label">新增语录</div>
                            <textarea
                                value={newQuote}
                                onChange={(e) => setNewQuote(e.target.value)}
                                placeholder="把新的句子加进目录..."
                            />
                            <div className="modal-actions">
                                <button className="action-btn btn-cancel" onClick={onClose}>取消</button>
                                <button className="music-mini-btn" onClick={addDraft}>先加入列表</button>
                                <button className="action-btn btn-confirm" onClick={handleSave}>保存目录</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        // 渲染根节点
        const root = createRoot(document.getElementById('root'));
        root.render(<App />);
