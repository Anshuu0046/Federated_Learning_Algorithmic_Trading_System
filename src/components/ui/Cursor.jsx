import React, { useEffect } from 'react';

const Cursor = () => {
    useEffect(() => {
        const cur = document.getElementById('cur');
        const ring = document.getElementById('cur-ring');

        if (!cur || !ring) return;

        let mx = 0, my = 0, rx = 0, ry = 0;

        const onMouseMove = (e) => {
            mx = e.clientX;
            my = e.clientY;
            cur.style.left = mx + 'px';
            cur.style.top = my + 'px';
        };

        document.addEventListener('mousemove', onMouseMove);

        let animationFrameId;
        const anim = () => {
            rx += (mx - rx) * 0.1;
            ry += (my - ry) * 0.1;
            ring.style.left = rx + 'px';
            ring.style.top = ry + 'px';
            animationFrameId = requestAnimationFrame(anim);
        };
        anim();

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <div id="cur" className="cursor-dot"></div>
            <div id="cur-ring" className="cursor-ring"></div>
        </>
    );
};

export default Cursor;
