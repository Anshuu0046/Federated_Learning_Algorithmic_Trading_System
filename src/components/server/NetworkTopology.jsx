import { useRef, useEffect } from 'react';

const NetworkTopology = ({ clients, isTraining, globalRound, fullScreen = false }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Neon Architect dark palette
        const colors = {
            server: '#9fa7ff',       // primary
            client: '#6d758c',       // outline
            clientActive: '#7de9ff', // tertiary
            line: 'rgba(99, 102, 241, 0.15)',
            lineActive: 'rgba(99, 102, 241, 0.3)',
            particle: '#7de9ff',     // tertiary
            particleGlow: 'rgba(125, 233, 255, 0.6)',
            text: '#dee5ff',         // on-surface
            textLight: '#a3aac4',    // on-surface-variant
            bg: 'rgba(6, 14, 32, 0.0)' // transparent
        };

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Node definitions
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = fullScreen ? Math.min(canvas.width, canvas.height) * 0.35 : Math.min(canvas.width, canvas.height) * 0.3;

        const serverNode = { x: centerX, y: centerY, label: 'AGG', radius: 24 };

        // Position clients in a circle
        const clientNodes = clients.map((client, i) => {
            const angle = (i / clients.length) * Math.PI * 2 - Math.PI / 2;
            return {
                ...client,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                label: client.name,
                radius: 12
            };
        });

        // Particles for animation
        const particles = [];
        if (isTraining) {
            clientNodes.forEach(client => {
                for (let i = 0; i < 3; i++) {
                    particles.push({
                        startX: client.x,
                        startY: client.y,
                        endX: serverNode.x,
                        endY: serverNode.y,
                        progress: Math.random(),
                        speed: 0.005 + Math.random() * 0.01,
                        size: 1.5 + Math.random() * 1.5
                    });
                }
            });
        }

        const drawNode = (x, y, r, color, label, isServer = false) => {
            // Glow effect
            ctx.shadowBlur = isServer ? 25 : 10;
            ctx.shadowColor = color;

            // Node body
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Reset shadow for text
            ctx.shadowBlur = 0;

            // Inner circle for server
            if (isServer && isTraining) {
                ctx.beginPath();
                ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(6, 14, 32, 0.8)';
                ctx.fill();

                // Pulse effect
                const pulseRatio = (Math.sin(Date.now() / 200) + 1) / 2;
                ctx.beginPath();
                ctx.arc(x, y, r + pulseRatio * 12, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(159, 167, 255, ${0.3 * (1 - pulseRatio)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Label
            ctx.font = isServer ? '600 13px "Manrope"' : '500 11px "Inter"';
            ctx.fillStyle = isServer ? 'rgba(6, 14, 32, 0.9)' : colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isServer) {
                ctx.fillText(label, x, y);
            } else {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nx = x + (dx / dist) * 25;
                const ny = y + (dy / dist) * 25;

                ctx.fillStyle = colors.textLight;
                ctx.fillText(label, nx, ny);
            }
        };

        const drawLine = (x1, y1, x2, y2, isActive) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = isActive ? colors.lineActive : colors.line;
            ctx.lineWidth = isActive ? 1.5 : 1;
            ctx.setLineDash([]);
            ctx.stroke();
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            clientNodes.forEach(client => {
                drawLine(client.x, client.y, serverNode.x, serverNode.y, isTraining);
            });

            // Draw particles (Data flow)
            particles.forEach(p => {
                p.progress += p.speed;
                if (p.progress >= 1) {
                    p.progress = 0;
                }

                const currentX = p.startX + (p.endX - p.startX) * p.progress;
                const currentY = p.startY + (p.endY - p.startY) * p.progress;

                // Glow
                ctx.shadowBlur = 8;
                ctx.shadowColor = colors.particleGlow;
                ctx.fillStyle = colors.particle;

                ctx.beginPath();
                ctx.arc(currentX, currentY, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Trail
                ctx.beginPath();
                ctx.moveTo(currentX, currentY);
                const tailX = p.startX + (p.endX - p.startX) * Math.max(0, p.progress - 0.05);
                const tailY = p.startY + (p.endY - p.startY) * Math.max(0, p.progress - 0.05);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `rgba(125, 233, 255, ${0.6 * (1 - p.progress)})`;
                ctx.lineWidth = p.size;
                ctx.stroke();
            });
            ctx.shadowBlur = 0;

            // Draw nodes
            clientNodes.forEach(client => {
                const isActive = isTraining && client.status === 'training';
                drawNode(client.x, client.y, client.radius, isActive ? colors.clientActive : colors.client, client.label, false);
            });

            // Draw server
            drawNode(serverNode.x, serverNode.y, serverNode.radius, colors.server, serverNode.label, true);

            // Draw Round info
            if (globalRound > 0) {
                ctx.font = '600 13px "Manrope"';
                ctx.fillStyle = colors.textLight;
                ctx.textAlign = 'left';
                ctx.fillText(`Federation Round: ${globalRound}`, 20, 30);

                if (isTraining) {
                    ctx.fillStyle = colors.particle;
                    ctx.font = '500 11px "Inter"';
                    ctx.fillText('AGGREGATING WEIGHTS...', 20, 50);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [clients, isTraining, globalRound, fullScreen]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ background: 'transparent' }}
        />
    );
};

export default NetworkTopology;
