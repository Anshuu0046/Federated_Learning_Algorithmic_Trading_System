import React, { useRef, useEffect } from 'react';

const NetworkTopology = ({ clients, isTraining, globalRound, fullScreen = false }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Define editorial colors
        const colors = {
            server: '#1a1a18', // ink
            client: '#8a8a80', // mid
            line: 'rgba(214, 210, 200, 0.6)', // rule
            particle: '#cdb483', // light accent (gold)
            text: '#1a1a18', // ink
            textLight: '#c4c0b4', // light
            bg: 'rgba(245, 242, 236, 0.0)' // transparent to let parent cream show
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
            // Generate particles flowing from clients to server
            clientNodes.forEach(client => {
                // Create 2-3 particles per stream
                for (let i = 0; i < 3; i++) {
                    particles.push({
                        startX: client.x,
                        startY: client.y,
                        endX: serverNode.x,
                        endY: serverNode.y,
                        progress: Math.random(), // Random starting position along the path
                        speed: 0.005 + Math.random() * 0.01,
                        size: 1.5 + Math.random() * 1.5
                    });
                }
            });
        }

        const drawNode = (x, y, r, color, label, isServer = false) => {
            // Glow effect (subtle for editorial)
            ctx.shadowBlur = isServer ? 15 : 5;
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
                ctx.fillStyle = colors.bg;
                ctx.fill();

                // Pulse effect
                const pulseRatio = (Math.sin(Date.now() / 200) + 1) / 2;
                ctx.beginPath();
                ctx.arc(x, y, r + pulseRatio * 10, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(26, 26, 24, ${0.1 * (1 - pulseRatio)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Label
            ctx.font = isServer ? 'normal 13px "Instrument Sans"' : 'normal 11px "Instrument Sans"';
            ctx.fillStyle = isServer ? colors.bg : colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.letterSpacing = '0.05em';

            if (isServer) {
                ctx.fillText(label, x, y);
            } else {
                // Draw client label outside the node
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nx = x + (dx / dist) * 25;
                const ny = y + (dy / dist) * 25;

                ctx.fillStyle = colors.text;
                ctx.fillText(label, nx, ny);
            }
        };

        const drawLine = (x1, y1, x2, y2, isActive) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = colors.line;
            ctx.lineWidth = isActive ? 1.5 : 1;
            if (isActive) {
                // ctx.setLineDash([4, 4]); // Optional dashed lines
            } else {
                ctx.setLineDash([]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            clientNodes.forEach(client => {
                drawLine(client.x, client.y, serverNode.x, serverNode.y, isTraining);
            });

            // Draw particles (Data flow)
            ctx.shadowBlur = 4;
            ctx.shadowColor = colors.particle;
            ctx.fillStyle = colors.particle;

            particles.forEach(p => {
                p.progress += p.speed;
                if (p.progress >= 1) {
                    p.progress = 0; // Loop back to start
                }

                const currentX = p.startX + (p.endX - p.startX) * p.progress;
                const currentY = p.startY + (p.endY - p.startY) * p.progress;

                ctx.beginPath();
                ctx.arc(currentX, currentY, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Draw a subtle trail
                ctx.beginPath();
                ctx.moveTo(currentX, currentY);
                const tailX = p.startX + (p.endX - p.startX) * Math.max(0, p.progress - 0.05);
                const tailY = p.startY + (p.endY - p.startY) * Math.max(0, p.progress - 0.05);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `rgba(200, 169, 110, ${1 - p.progress})`;
                ctx.lineWidth = p.size;
                ctx.stroke();
            });
            ctx.shadowBlur = 0;

            // Draw nodes
            clientNodes.forEach(client => {
                const isActive = isTraining && client.status === 'training';
                drawNode(client.x, client.y, client.radius, isActive ? colors.server : colors.client, client.label, false);
            });

            // Draw server
            drawNode(serverNode.x, serverNode.y, serverNode.radius, colors.server, serverNode.label, true);

            // Draw Round info inside canvas
            if (globalRound > 0) {
                ctx.font = 'normal 13px "Playfair Display"';
                ctx.fillStyle = colors.textLight;
                ctx.textAlign = 'left';
                ctx.fillText(`Federation Round: ${globalRound}`, 20, 30);

                if (isTraining) {
                    ctx.fillStyle = colors.text;
                    ctx.font = 'normal 11px "Instrument Sans"';
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
