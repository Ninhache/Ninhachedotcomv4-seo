"use client"


import styles from '@/styles/home.module.css';

import { ISourceOptions } from '@tsparticles/engine';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useMemo, useState } from 'react';
import { loadFull } from 'tsparticles';



export default function ParticlesComponent() {

    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
          await loadFull(engine);
        }).then(() => {
          setInit(true);
        });
      }, []);
    

    const options: ISourceOptions = useMemo(
        () => ({
            particles: {
                number: {
                    value: 400,
                    density: {
                        enable: true,
                    },
                },
                color: {
                    value: "#fff",
                },
                shape: {
                    type: "circle",
                },
                opacity: {
                    value: 1,
                },
                size: {
                    value: 10,
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "bottom",
                    straight: true,
                },
                wobble: {
                    enable: true,
                    distance: 10,
                    speed: 10,
                },
                zIndex: {
                    value: {
                        min: 0,
                        max: 100,
                    },
                    opacityRate: 10,
                    sizeRate: 10,
                    velocityRate: 10,
                },
            },
        }),
        [],
    );
    
    // const particlesLoaded = async (container?: Container): Promise<void> => {
        
    // };

    return (
        init && <Particles
            id="tsparticles"
            // particlesLoaded={particlesLoaded}
            className={styles.particles}
            style={{
                zIndex: 1
            }}
            // url='http://localhost:3000/particles.json'
            options={options}
        />
    )
}