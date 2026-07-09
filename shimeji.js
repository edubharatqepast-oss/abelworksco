const SHIMEJI_MAX = 2;
let shimejis = [];
let sparkParticles = [];

class Spark {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6 - 2;
        this.life = 1;
        this.decay = 0.025 + Math.random() * 0.035;
        this.size = 2 + Math.random() * 4;
        const colors = ['#FFD700', '#FFA500', '#88CCFF', '#FFFFFF', '#FFE066'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.type = Math.random() > 0.55 ? 'bolt' : 'dot';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12;
        this.vx *= 0.99;
        this.life -= this.decay;
        this.size *= 0.97;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life * 0.9;
        if (this.type === 'bolt') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            let lx = this.x, ly = this.y;
            for (let i = 0; i < 3; i++) {
                lx += (Math.random() - 0.5) * 10;
                ly += 3 + Math.random() * 5;
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }
}

class Shimeji {
    constructor(x, y) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 128;
        this.canvas.height = 128;
        this.canvas.className = 'shimeji-pikachu';
        this.canvas.style.cssText = `
            position: fixed;
            z-index: 9999;
            pointer-events: all;
            cursor: grab;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            filter: drop-shadow(0 2px 8px rgba(255,215,0,0.35));
        `;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        document.body.appendChild(this.canvas);

        this.x = x ?? Math.random() * (window.innerWidth - 128);
        this.y = y ?? -140;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * 1.2;
        this.vy = 0;
        this.w = 128;
        this.h = 128;
        this.ground = window.innerHeight - 128;
        this.gravity = 0.5;
        this.state = 'falling';
        this.facing = this.vx > 0 ? 1 : -1;
        this.frame = 0;
        this.tick = 0;
        this.stateTimer = 0;
        this.idleWait = 150 + Math.random() * 200;
        this.walkSpeed = 0.9 + Math.random() * 0.5;
        this.isDragging = false;
        this.dragOX = 0;
        this.dragOY = 0;
        this.climbDir = 0;
        this.sparkTimer = 0;
        this.climbTick = 0;
        this.sitFrame = 0;
        this.blinking = false;
        this.jiggle = 0;

        // Speech bubble
        this.bubble = document.createElement('div');
        this.bubble.style.cssText = `
            position: fixed;
            z-index: 10000;
            pointer-events: none;
            background: white;
            color: #1a1a1a;
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            font-size: 14px;
            padding: 6px 12px;
            border-radius: 12px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform: translateY(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(this.bubble);
        this.bubbleTimeout = null;
        this.nextSpeechTime = 5000 + Math.random() * 10000;
        this.speechTimer = 0;
        this.speechPhrases = [
            'Pika!', 'Pikachu!', 'Pika pika!', 'Pika pi!',
            'Chaa!', 'Pikaaa!', 'Pika!!', 'Chu chu!',
            'Pika~', 'Pikaaaa!', 'Pika pika pi!'
        ];

        // Random movement goals
        this.goalX = null;
        this.wanderTimer = 0;
        this.wanderInterval = 120 + Math.random() * 180;

        this._events();
        this._loop();
    }

    _events() {
        const down = (e) => {
            if (e.target !== this.canvas) return;
            e.preventDefault();
            this.isDragging = true;
            this.state = 'dragging';
            this.vy = 0;
            this.vx = 0;
            this.dragOX = e.clientX - this.x;
            this.dragOY = e.clientY - this.y;
            this.canvas.style.cursor = 'grabbing';
            this.canvas.style.filter = 'drop-shadow(0 6px 20px rgba(255,215,0,0.6))';
        };
        const move = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.x = e.clientX - this.dragOX;
            this.y = e.clientY - this.dragOY;
        };
        const up = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            this.canvas.style.filter = 'drop-shadow(0 2px 8px rgba(255,215,0,0.35))';
            this.vx = (e.movementX || 0) * 0.15;
            this.vy = -5;
            this.state = 'falling';
        };
        this.canvas.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('resize', () => {
            this.ground = window.innerHeight - 128;
        });
    }

    _loop() {
        const tick = () => {
            this._update();
            this._render();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    _showSpeech() {
        const phrase = this.speechPhrases[Math.floor(Math.random() * this.speechPhrases.length)];
        this.bubble.textContent = phrase;
        this.bubble.style.opacity = '1';
        this.bubble.style.transform = 'translateY(0)';
        this.bubble.style.left = (this.x + 64 - this.bubble.offsetWidth / 2) + 'px';
        this.bubble.style.top = (this.y - 35) + 'px';
        clearTimeout(this.bubbleTimeout);
        this.bubbleTimeout = setTimeout(() => {
            this.bubble.style.opacity = '0';
            this.bubble.style.transform = 'translateY(5px)';
        }, 1800 + Math.random() * 1200);
    }

    _update() {
        this.tick++;
        this.stateTimer++;
        this.speechTimer += 16.67;

        if (this.speechTimer >= this.nextSpeechTime && this.state !== 'dragging' && this.state !== 'falling') {
            this._showSpeech();
            this.speechTimer = 0;
            this.nextSpeechTime = 5000 + Math.random() * 15000;
        }

        if (this.tick % 100 === 0) {
            this.blinking = true;
            setTimeout(() => this.blinking = false, 150);
        }

        // Random wander goals while walking
        this.wanderTimer++;
        if (this.wanderTimer >= this.wanderInterval && this.state === 'walking') {
            this.wanderTimer = 0;
            this.wanderInterval = 80 + Math.random() * 200;
            const r = Math.random();
            if (r < 0.25) {
                this.facing *= -1;
                this.walkSpeed = 0.5 + Math.random() * 1.2;
            } else if (r < 0.4) {
                this.vy = -8 - Math.random() * 6;
                this.state = 'falling';
            } else if (r < 0.55) {
                this.state = 'idle';
                this.vx = 0;
                this.stateTimer = 0;
                this.sitFrame = 0;
                this.idleWait = 60 + Math.random() * 100;
            }
        }

        if (this.isDragging) {
            this.canvas.style.left = this.x + 'px';
            this.canvas.style.top = this.y + 'px';
            return;
        }

        switch (this.state) {
            case 'falling':
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                if (this.y >= this.ground) {
                    this.y = this.ground;
                    this.vy = 0;
                    this.vx *= 0.4;
                    this.jiggle = 12;
                    if (Math.abs(this.vx) > 0.4) {
                        this.state = 'walking';
                    } else {
                        this.state = 'idle';
                        this.stateTimer = 0;
                        this.sitFrame = 0;
                    }
                }
                if (this.x <= 0 || this.x >= window.innerWidth - this.w) {
                    this.state = 'climbing';
                    this.x = this.x <= 0 ? 0 : window.innerWidth - this.w;
                    this.vx = 0;
                    this.vy = 0;
                    this.climbDir = this.y > 100 ? -1 : 1;
                    this.climbTick = 0;
                }
                break;

            case 'walking':
                this.vx = this.facing * this.walkSpeed;
                this.x += this.vx;
                if (this.tick % 8 === 0) this.frame = (this.frame + 1) % 4;
                this.sparkTimer++;
                if (this.sparkTimer % 4 === 0) {
                    for (let i = 0; i < 2; i++) {
                        sparkParticles.push(new Spark(
                            this.x + (this.facing > 0 ? this.w * 0.35 : this.w * 0.65) + (Math.random() - 0.5) * 10,
                            this.y + this.h * 0.88 + Math.random() * 8
                        ));
                    }
                }
                if (this.x <= 0 || this.x >= window.innerWidth - this.w) {
                    this.state = 'climbing';
                    this.x = this.x <= 0 ? 0 : window.innerWidth - this.w;
                    this.vx = 0;
                    this.vy = 0;
                    this.climbDir = Math.random() > 0.5 ? -1 : 1;
                    this.climbTick = 0;
                    break;
                }
                if (this.stateTimer > this.idleWait) {
                    const r = Math.random();
                    if (r < 0.25) {
                        this.state = 'idle';
                        this.vx = 0;
                        this.stateTimer = 0;
                        this.sitFrame = 0;
                    } else if (r < 0.4) {
                        this.vy = -10 - Math.random() * 6;
                        this.state = 'falling';
                    } else if (r < 0.55) {
                        this.state = 'climbing';
                        this.climbDir = Math.random() > 0.5 ? -1 : 1;
                        this.climbTick = 0;
                        this.stateTimer = 0;
                    } else if (r < 0.7) {
                        this.facing *= -1;
                        this.walkSpeed = 1.5 + Math.random() * 1.5;
                        this.stateTimer = 0;
                        this.idleWait = 60 + Math.random() * 120;
                    } else {
                        this.facing *= -1;
                        this.walkSpeed = 0.4 + Math.random() * 0.3;
                        this.stateTimer = 0;
                        this.idleWait = 200 + Math.random() * 300;
                    }
                }
                break;

            case 'idle':
                this.vx = 0;
                if (this.tick % 20 === 0) this.frame = (this.frame + 1) % 2;
                if (this.stateTimer > 80) this.sitFrame = 1;
                if (this.stateTimer > this.idleWait) {
                    const r = Math.random();
                    if (r < 0.35) {
                        this.state = 'walking';
                        this.facing = Math.random() > 0.5 ? 1 : -1;
                        this.walkSpeed = 0.5 + Math.random() * 1.5;
                        this.vx = this.facing * this.walkSpeed;
                        this.stateTimer = 0;
                    } else if (r < 0.5) {
                        this.vy = -10 - Math.random() * 6;
                        this.state = 'falling';
                    } else if (r < 0.65) {
                        this.state = 'climbing';
                        this.climbDir = Math.random() > 0.5 ? -1 : -1;
                        this.climbTick = 0;
                        this.stateTimer = 0;
                    } else if (r < 0.8) {
                        this.facing *= -1;
                        this.stateTimer = 0;
                        this.sitFrame = 0;
                        this.idleWait = 30 + Math.random() * 60;
                    } else {
                        this.sitFrame = 0;
                        this.stateTimer = 0;
                        this.idleWait = 200 + Math.random() * 400;
                    }
                    this.stateTimer = 0;
                    this.idleWait = 60 + Math.random() * 250;
                }
                break;

            case 'climbing':
                this.climbTick++;
                this.vx = 0;
                this.vy = this.climbDir * 1.5;
                this.y += this.vy;
                if (this.tick % 10 === 0) this.frame = (this.frame + 1) % 4;
                if (this.tick % 6 === 0) {
                    for (let i = 0; i < 2; i++) {
                        sparkParticles.push(new Spark(
                            this.x + (this.x <= 20 ? 0 : this.w) + (Math.random() - 0.5) * 8,
                            this.y + 20 + Math.random() * (this.h - 40)
                        ));
                    }
                }
                if (this.y <= 0) {
                    this.y = 0;
                    this.climbDir = 1;
                }
                if (this.y >= this.ground) {
                    this.y = this.ground;
                    this.state = 'walking';
                    this.vx = (Math.random() > 0.5 ? 1 : -1) * this.walkSpeed;
                    this.facing = this.vx > 0 ? 1 : -1;
                    this.stateTimer = 0;
                    this.jiggle = 10;
                }
                if (this.climbTick > 180 + Math.random() * 200) {
                    if (this.x <= 20) {
                        this.facing = 1;
                        this.vx = 3;
                        this.x = 20;
                    } else {
                        this.facing = -1;
                        this.vx = -3;
                        this.x = window.innerWidth - this.w - 20;
                    }
                    this.state = 'falling';
                    this.vy = -3;
                    this.stateTimer = 0;
                }
                break;

            case 'dragging':
                break;
        }

        if (this.jiggle > 0) this.jiggle *= 0.8;
        if (this.jiggle < 0.3) this.jiggle = 0;

        this.canvas.style.left = this.x + 'px';
        this.canvas.style.top = this.y + 'px';

        // Update bubble position
        if (this.bubble.style.opacity === '1') {
            this.bubble.style.left = (this.x + 64 - this.bubble.offsetWidth / 2) + 'px';
            this.bubble.style.top = (this.y - 35) + 'px';
        }
    }

    _render() {
        const c = this.ctx;
        c.clearRect(0, 0, 128, 128);

        const S = 2;
        const px = (x, y, color) => {
            c.fillStyle = color;
            c.fillRect(x * S, y * S, S, S);
        };

        const drawBody = () => {
            const Y = '#FFD700';
            const YL = '#FFF8B0';
            const YD = '#C8A200';
            const B = '#1a1a1a';
            const R = '#E04040';
            const BR = '#8B5E3C';
            const W = '#FFFFFF';

            // Shadow
            c.fillStyle = 'rgba(0,0,0,0.1)';
            c.beginPath();
            c.ellipse(64, 116, 30, 6, 0, 0, Math.PI * 2);
            c.fill();

            // Tail
            const tb = Math.sin(this.tick * 0.1) * 2;
            px(16, 28 + tb, Y); px(15, 27 + tb, Y); px(14, 26 + tb, Y);
            px(13, 25 + tb, Y); px(14, 24 + tb, Y); px(13, 23 + tb, Y);
            px(12, 22 + tb, Y); px(11, 21 + tb, Y); px(12, 20 + tb, Y);
            px(10, 19 + tb, YD); px(11, 18 + tb, YD); px(10, 17 + tb, YD);
            px(9, 16 + tb, YD);

            // Body
            for (let i = 0; i < 16; i++) for (let j = 4; j < 20; j++) px(22 + i, 24 + j, Y);
            for (let i = 2; i < 14; i++) for (let j = 6; j < 18; j++) px(23 + i, 26 + j, YL);

            // Head
            for (let i = 0; i < 16; i++) for (let j = 0; j < 14; j++) px(22 + i, 12 + j, Y);

            // Left ear
            for (let j = 0; j < 12; j++) { px(20, 2 + j, Y); px(21, 1 + j, Y); }
            for (let j = 0; j < 7; j++) { px(20, 2 + j, B); px(21, 1 + j, B); }
            // Right ear
            for (let j = 0; j < 12; j++) { px(38, 2 + j, Y); px(37, 1 + j, Y); }
            for (let j = 0; j < 7; j++) { px(38, 2 + j, B); px(37, 1 + j, B); }

            // Cheeks
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
                px(22 + i, 20 + j, R); px(36 + i, 20 + j, R);
            }

            // Nose
            px(31, 20, B); px(32, 20, B);
        };

        const drawFaceOpen = () => {
            const B = '#1a1a1a';
            const W = '#FFFFFF';
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
                px(26 + i, 17 + j, B); px(35 + i, 17 + j, B);
            }
            px(26, 17, W); px(35, 17, W);
            px(29, 22, B); px(30, 23, B); px(31, 24, B); px(32, 23, B); px(33, 22, B);
        };

        const drawFaceSit = () => {
            const B = '#1a1a1a';
            px(25, 17, B); px(26, 16, B); px(27, 17, B);
            px(35, 17, B); px(36, 16, B); px(37, 17, B);
            px(29, 22, B); px(30, 23, B); px(31, 24, B); px(32, 23, B); px(33, 22, B);
        };

        const drawFaceScared = () => {
            const B = '#1a1a1a';
            const W = '#FFFFFF';
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
                px(25 + i, 16 + j, B); px(35 + i, 16 + j, B);
            }
            px(26, 17, W); px(36, 17, W);
            px(29, 22, B); px(30, 22, B); px(31, 22, B); px(32, 22, B); px(33, 22, B);
            px(29, 23, B); px(30, 23, '#FF6B6B'); px(31, 23, '#FF6B6B'); px(32, 23, '#FF6B6B'); px(33, 23, B);
            px(30, 24, B); px(31, 24, B); px(32, 24, B);
        };

        const drawFeetWalk = (frame) => {
            const BR = '#8B5E3C';
            if (frame === 0 || frame === 2) {
                for (let i = 0; i < 6; i++) { px(23 + i, 44, BR); px(35 + i, 42, BR); }
                px(23, 45, BR); px(35, 43, BR);
            } else if (frame === 1) {
                for (let i = 0; i < 6; i++) { px(24 + i, 45, BR); px(34 + i, 45, BR); }
            } else {
                for (let i = 0; i < 6; i++) { px(22 + i, 43, BR); px(36 + i, 43, BR); }
            }
        };

        const drawFeetSit = () => {
            const BR = '#8B5E3C';
            for (let i = 0; i < 6; i++) { px(22 + i, 46, BR); px(36 + i, 46, BR); }
            for (let i = 0; i < 5; i++) { px(23 + i, 47, BR); px(37 + i, 47, BR); }
        };

        const drawArmsWalk = (frame) => {
            const Y = '#FFD700';
            const swing = Math.sin(frame * Math.PI / 2) * 3;
            for (let i = 0; i < 5; i++) { px(19 + i, 30 + swing + i, Y); px(41 - i, 30 - swing + i, Y); }
            for (let i = 0; i < 4; i++) { px(19 + i, 31 + swing + i, Y); px(41 - i, 31 - swing + i, Y); }
        };

        const drawArmsClimb = (frame) => {
            const Y = '#FFD700';
            if (frame % 2 === 0) {
                for (let i = 0; i < 5; i++) { px(18 + i, 28 + i, Y); px(42 - i, 32 + i, Y); }
                for (let i = 0; i < 4; i++) { px(18 + i, 29 + i, Y); px(42 - i, 33 + i, Y); }
            } else {
                for (let i = 0; i < 5; i++) { px(18 + i, 32 + i, Y); px(42 - i, 28 + i, Y); }
                for (let i = 0; i < 4; i++) { px(18 + i, 33 + i, Y); px(42 - i, 29 + i, Y); }
            }
        };

        const drawArmsDrag = () => {
            const Y = '#FFD700';
            for (let i = 0; i < 6; i++) { px(17 + i, 34 + i, Y); px(43 - i, 34 + i, Y); }
            for (let i = 0; i < 5; i++) { px(17 + i, 35 + i, Y); px(43 - i, 35 + i, Y); }
        };

        const drawFeetDrag = () => {
            const BR = '#8B5E3C';
            for (let i = 0; i < 5; i++) { px(25 + i, 46 + i, BR); px(35 + i, 46 + i, BR); }
        };

        const drawArmsFall = () => {
            const Y = '#FFD700';
            for (let i = 0; i < 6; i++) { px(16 + i, 30 + i, Y); px(44 - i, 30 + i, Y); }
            for (let i = 0; i < 5; i++) { px(16 + i, 31 + i, Y); px(44 - i, 31 + i, Y); }
        };

        const drawFeetFall = () => {
            const BR = '#8B5E3C';
            for (let i = 0; i < 5; i++) { px(21 + i, 46 + i, BR); px(39 - i, 46 + i, BR); }
        };

        c.save();
        if (this.facing < 0) {
            c.translate(128, 0);
            c.scale(-1, 1);
        }
        if (this.jiggle > 0.5) {
            c.translate(64, 128);
            c.scale(1 + this.jiggle * 0.008, 1 - this.jiggle * 0.004);
            c.translate(-64, -128);
        }

        drawBody();

        if (this.state === 'walking') {
            drawFaceOpen();
            drawArmsWalk(this.frame);
            drawFeetWalk(this.frame);
        } else if (this.state === 'idle' && this.sitFrame) {
            drawFaceSit();
            drawFeetSit();
            const Y = '#FFD700';
            for (let i = 0; i < 4; i++) { px(18 + i, 34 + i, Y); px(42 - i, 34 + i, Y); }
        } else if (this.state === 'climbing') {
            drawFaceOpen();
            drawArmsClimb(this.frame);
            const BR = '#8B5E3C';
            for (let i = 0; i < 5; i++) { px(24 + i, 46, BR); px(35 + i, 46, BR); }
        } else if (this.state === 'falling') {
            drawFaceScared();
            drawArmsFall();
            drawFeetFall();
        } else if (this.state === 'dragging') {
            drawFaceScared();
            drawArmsDrag();
            drawFeetDrag();
        } else {
            drawFaceOpen();
            drawArmsWalk(0);
            drawFeetWalk(0);
        }

        if (this.blinking && this.state !== 'falling' && this.state !== 'dragging') {
            const Y = '#FFD700';
            px(26, 17, Y); px(27, 17, Y); px(28, 17, Y);
            px(35, 17, Y); px(36, 17, Y); px(37, 17, Y);
        }

        c.restore();
    }

    destroy() {
        this.canvas.remove();
        this.bubble.remove();
        clearTimeout(this.bubbleTimeout);
    }
}

function spawnShimeji(x, y) {
    if (shimejis.length >= SHIMEJI_MAX) return null;
    const s = new Shimeji(x, y);
    shimejis.push(s);
    return s;
}

function removeShimeji(s) {
    const idx = shimejis.indexOf(s);
    if (idx !== -1) shimejis.splice(idx, 1);
    s.destroy();
}

const sparkCanvas = document.createElement('canvas');
sparkCanvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9998;
    pointer-events: none;
`;
document.body.appendChild(sparkCanvas);
const sparkCtx = sparkCanvas.getContext('2d');

function resizeSparkCanvas() {
    sparkCanvas.width = window.innerWidth;
    sparkCanvas.height = window.innerHeight;
}
resizeSparkCanvas();
window.addEventListener('resize', resizeSparkCanvas);

function animateSparks() {
    sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
    for (let i = sparkParticles.length - 1; i >= 0; i--) {
        sparkParticles[i].update();
        sparkParticles[i].draw(sparkCtx);
        if (sparkParticles[i].life <= 0) {
            sparkParticles.splice(i, 1);
        }
    }
    requestAnimationFrame(animateSparks);
}
animateSparks();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        spawnShimeji(
            Math.random() * (window.innerWidth - 128),
            -140
        );
    }, 600);
});
