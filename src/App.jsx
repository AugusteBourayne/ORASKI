// @ts-nocheck
import { useEffect, useRef, useState } from "react";

const VIDEO_DESCENTE_URL = "/media/video/Ski HD.mp4";
const BPM_ALERT_THRESHOLD = 175;

function resetHudStatics() {
  const values = {
    "#af-time": "11:25",
    "#af-altitude": "2145m",
    "#af-bpm": "158bpm",
    "#af-duration": "7H20",
    "#af-temp-obj": "33.1°C",
    "#af-temp-amb": "-6.5°C",
  };

  Object.entries(values).forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("value", value);
  });
}

export default function App() {
  const sceneRef = useRef(null);
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("loading");
  const [isVrMode, setIsVrMode] = useState(false);
  const [sequenceKey, setSequenceKey] = useState(0);
  const [alertMode, setAlertMode] = useState("none");
  const [bpm, setBpm] = useState(158);
  const [progress, setProgress] = useState(0);
  const [breathPhase, setBreathPhase] = useState("inhale");
  const [logoSrc, setLogoSrc] = useState("/media/hud/png-elements/hq/Logo vert.png");
  const alertFiredRef = useRef(false);

  const isLoading = phase === "loading";
  const isPlaying = phase === "playing";
  const isIdle = phase === "idle";
  const COL = "#6AD2CA";
  const INITIAL_CAMERA_YAW = 270;
  const BREATH_INHALE_MS = 4000;
  const BREATH_EXHALE_MS = 6000;
  const BREATH_CYCLE_MS = BREATH_INHALE_MS + BREATH_EXHALE_MS;
  const breathInstruction = breathPhase === "inhale" ? "Inspirez lentement" : "Expirez";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId = 0;

    const tick = () => {
      if (video.duration > 0 && video.buffered.length > 0) {
        const pct = Math.round((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
        setProgress(Math.min(99, pct));
      }
      rafId = window.requestAnimationFrame(tick);
    };

    const handleReady = () => {
      window.cancelAnimationFrame(rafId);
      setProgress(100);
      setPhase("idle");
    };

    const handleError = () => {
      window.cancelAnimationFrame(rafId);
      setPhase("idle");
    };

    video.preload = "auto";
    video.load();
    rafId = window.requestAnimationFrame(tick);
    video.addEventListener("canplaythrough", handleReady, { once: true });
    video.addEventListener("error", handleError, { once: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      video.removeEventListener("canplaythrough", handleReady);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;

    const enterVr = () => {
      if (typeof sceneEl.enterVR === "function") {
        sceneEl.enterVR().catch?.(() => {});
      }
    };

    if (sceneEl.hasLoaded) {
      enterVr();
    } else {
      sceneEl.addEventListener("loaded", enterVr, { once: true });
    }

    const handleEnterVr = () => setIsVrMode(true);
    const handleExitVr = () => setIsVrMode(false);
    sceneEl.addEventListener("enter-vr", handleEnterVr);
    sceneEl.addEventListener("exit-vr", handleExitVr);

    return () => {
      sceneEl.removeEventListener("loaded", enterVr);
      sceneEl.removeEventListener("enter-vr", handleEnterVr);
      sceneEl.removeEventListener("exit-vr", handleExitVr);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      startSequence();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase]);

  useEffect(() => {
    const playButtonEl = document.querySelector("#af-play-button");
    if (!playButtonEl) return;

    const handleClick = () => startSequence();
    playButtonEl.addEventListener("click", handleClick);
    return () => playButtonEl.removeEventListener("click", handleClick);
  }, [phase]);

  useEffect(() => {
    const exitButtonEl = document.querySelector("#af-exit-vr-button");
    if (!exitButtonEl) return;

    const handleClick = () => exitVr();
    exitButtonEl.addEventListener("click", handleClick);
    return () => exitButtonEl.removeEventListener("click", handleClick);
  }, [isVrMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.pause();
      video.currentTime = 0;
      setPhase("idle");
      setAlertMode("none");
      setLogoSrc("/media/hud/png-elements/hq/Logo vert.png");
      setBreathPhase("inhale");
      setBpm(158);
      alertFiredRef.current = false;
      resetHudStatics();
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    alertFiredRef.current = false;
    setAlertMode("none");
    setBpm(158);
    resetHudStatics();

    const iv = window.setInterval(() => {
      setBpm((prev) => {
        const next = Math.min(prev + 1, 182);
        if (next >= BPM_ALERT_THRESHOLD && !alertFiredRef.current) {
          alertFiredRef.current = true;
          setAlertMode("breathing");
        }
        return next;
      });
    }, 1200);

    return () => window.clearInterval(iv);
  }, [isPlaying, sequenceKey]);

  useEffect(() => {
    const el = document.querySelector("#af-bpm");
    if (el) el.setAttribute("value", `${bpm}bpm`);
  }, [bpm]);

  useEffect(() => {
    const STAT_SELS = [
      "#af-stat-time",
      "#af-stat-altitude",
      "#af-stat-duration",
      "#af-stat-bpm",
      "#af-stat-temp",
      "#af-stat-meteo",
    ];

    const lineL = document.querySelector("#af-line-left");
    const lineR = document.querySelector("#af-line-right");

    if (lineL) {
      lineL.removeAttribute("animation");
      lineL.removeAttribute("animation__scale");
      lineL.removeAttribute("animation__pos");
      lineL.setAttribute("material", "shader: flat; transparent: true; opacity: 0");
      lineL.setAttribute("scale", "0.04 1 1");
      lineL.setAttribute("position", "-0.3 0.05 0");
    }
    if (lineR) {
      lineR.removeAttribute("animation");
      lineR.removeAttribute("animation__scale");
      lineR.removeAttribute("animation__pos");
      lineR.setAttribute("material", "shader: flat; transparent: true; opacity: 0");
      lineR.setAttribute("scale", "0.04 1 1");
      lineR.setAttribute("position", "0.3 0.05 0");
    }

    STAT_SELS.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.removeAttribute("animation");
      el.removeAttribute("animation__pulse");
      el.setAttribute("scale", "0 0 0");
    });

    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      if (lineL) {
        lineL.setAttribute("animation", {
          property: "material.opacity",
          from: 0,
          to: 1,
          dur: 700,
          easing: "easeOutQuad",
        });
        lineL.setAttribute("animation__scale", {
          property: "scale",
          from: "0.04 1 1",
          to: "1 1 1",
          dur: 950,
          easing: "easeOutCubic",
        });
        lineL.setAttribute("animation__pos", {
          property: "position",
          from: "-0.3 0.05 0",
          to: "-1.5 0.05 0",
          dur: 950,
          easing: "easeOutCubic",
        });
      }

      if (lineR) {
        lineR.setAttribute("animation", {
          property: "material.opacity",
          from: 0,
          to: 1,
          dur: 700,
          delay: 60,
          easing: "easeOutQuad",
        });
        lineR.setAttribute("animation__scale", {
          property: "scale",
          from: "0.04 1 1",
          to: "1 1 1",
          dur: 950,
          delay: 60,
          easing: "easeOutCubic",
        });
        lineR.setAttribute("animation__pos", {
          property: "position",
          from: "0.3 0.05 0",
          to: "1.5 0.05 0",
          dur: 950,
          delay: 60,
          easing: "easeOutCubic",
        });
      }

      STAT_SELS.forEach((sel, i) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("animation", {
          property: "scale",
          from: "0 0 0",
          to: "1 1 1",
          dur: 380,
          delay: 450 + i * 120,
          easing: "easeOutBack",
        });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isPlaying, sequenceKey]);

  useEffect(() => {
    const logo = document.querySelector("#af-logo");
    if (!logo) return;

    logo.removeAttribute("animation");
    logo.setAttribute("scale", "0.44 0.44 0.44");

    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      logo.setAttribute("animation", {
        property: "scale",
        from: "0.42 0.42 0.42",
        to: "0.47 0.47 0.47",
        dur: 2000,
        dir: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [isPlaying, sequenceKey]);

  useEffect(() => {
    let breathingTimer = null;

    if (alertMode === "none") {
      setLogoSrc("/media/hud/png-elements/hq/Logo vert.png");
      setBreathPhase("inhale");
      const bpmText = document.querySelector("#af-bpm");
      if (bpmText) bpmText.setAttribute("color", COL);
      const durText = document.querySelector("#af-duration");
      if (durText) durText.setAttribute("color", COL);
      const altText = document.querySelector("#af-altitude");
      if (altText) altText.setAttribute("color", COL);
      ["#af-stat-bpm", "#af-stat-altitude", "#af-stat-duration"].forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.removeAttribute("animation__pulse");
        el.setAttribute("scale", "1 1 1");
      });
      return;
    }

    if (alertMode === "breathing") {
      setLogoSrc("/media/hud/png-elements/hq/Logo jaune.png");
      setBreathPhase("inhale");
      let completedCycles = 0;

      const runBreathingPhase = (phaseName) => {
        setBreathPhase(phaseName);
        breathingTimer = window.setTimeout(() => {
          if (phaseName === "inhale") {
            runBreathingPhase("exhale");
            return;
          }
          completedCycles += 1;
          if (completedCycles >= 5) {
            setAlertMode("none");
            return;
          }
          runBreathingPhase("inhale");
        }, phaseName === "inhale" ? BREATH_INHALE_MS : BREATH_EXHALE_MS);
      };

      runBreathingPhase("inhale");
      window.setTimeout(() => {
        const textEl = document.querySelector("#af-bpm");
        if (textEl) textEl.setAttribute("color", "#F7D716");
        const statEl = document.querySelector("#af-stat-bpm");
        if (statEl) {
          statEl.setAttribute("animation__pulse", {
            property: "scale",
            from: "1 1 1",
            to: "1.15 1.15 1.15",
            dur: 750,
            dir: "alternate",
            loop: true,
            easing: "easeInOutSine",
          });
        }
      }, 350);
    }

    return () => {
      if (breathingTimer !== null) window.clearTimeout(breathingTimer);
    };
  }, [alertMode]);

  const startSequence = async () => {
    if (!videoRef.current || isLoading || isPlaying) return;

    const video = videoRef.current;
    video.currentTime = 0;
    setAlertMode("none");
    setLogoSrc("/media/hud/png-elements/hq/Logo vert.png");
    setBreathPhase("inhale");
    setSequenceKey((prev) => prev + 1);
    setPhase("playing");

    try {
      await video.play();
    } catch {
      setPhase("idle");
    }
  };

  const exitVr = () => {
    const sceneEl = sceneRef.current;
    if (sceneEl && typeof sceneEl.exitVR === "function") {
      sceneEl.exitVR();
    }
  };

  return (
    <div className="app-shell">
      <a-scene
        ref={sceneRef}
        vr-mode-ui="enabled: true"
        loading-screen="enabled: false"
        device-orientation-permission-ui="enabled: false"
        style={{ position: "absolute", inset: 0 }}
      >
        <a-assets>
          <video
            id="bg-video-af"
            ref={videoRef}
            src={VIDEO_DESCENTE_URL}
            crossOrigin="anonymous"
            preload="auto"
            loop={false}
            muted
            playsInline
          />
          <img id="af-img-line-l" src="/media/hud/png-elements/hq/Line%20gauche.png" crossOrigin="anonymous" />
          <img id="af-img-line-r" src="/media/hud/png-elements/hq/Line%20droite.png" crossOrigin="anonymous" />
          <img id="af-img-alti" src="/media/hud/png-elements/hq/Alti.png" crossOrigin="anonymous" />
          <img id="af-img-heure" src="/media/hud/png-elements/hq/Heure.png" crossOrigin="anonymous" />
          <img id="af-img-bpm" src="/media/hud/png-elements/hq/BPM.png" crossOrigin="anonymous" />
          <img id="af-img-temp" src="/media/hud/png-elements/hq/Temp%20corps.png" crossOrigin="anonymous" />
          <img id="af-img-meteo" src="/media/hud/png-elements/hq/Meteo.png" crossOrigin="anonymous" />
          <img id="af-img-nuit" src="/media/hud/png-elements/hq/Nuit.png" crossOrigin="anonymous" />
          <img id="af-img-play-button" src="/media/ui/play-button.svg" crossOrigin="anonymous" />
        </a-assets>

        <a-videosphere id="af-vs-descente" src="#bg-video-af" rotation="0 -180 0" />

        <a-entity id="af-camera-rig" rotation={`0 ${INITIAL_CAMERA_YAW} 0`}>
          <a-entity
            id="af-right-controller"
            laser-controls="hand: right"
            raycaster="objects: .af-clickable; origin: 0 0 -0.08"
            cursor="rayOrigin: entity"
            line="color: #6AD2CA; opacity: 0.9"
          />
          <a-camera
            id="af-camera"
            position="0 1.6 0"
            look-controls="pointerLockEnabled: false"
            raycaster={!isVrMode ? "objects: .af-clickable" : undefined}
            cursor={!isVrMode ? "rayOrigin: mouse" : undefined}
          >
            <a-entity
              id="af-hud"
              position="0 0.15 -4.1"
              visible={isPlaying ? "true" : "false"}
            >
              <a-image
                id="af-logo"
                src={logoSrc}
                material="shader: flat; transparent: true"
                position="0 0.45 0"
                width="0.44"
                height="0.44"
                scale="0.44 0.44 0.44"
              />

              <a-image
                id="af-line-left"
                src="#af-img-line-l"
                material="shader: flat; transparent: true; opacity: 0"
                position="-1.5 0.05 0"
                width="2.6"
                height="1.0"
              />

              <a-image
                id="af-line-right"
                src="#af-img-line-r"
                material="shader: flat; transparent: true; opacity: 0"
                position="1.5 0.05 0"
                width="2.6"
                height="1.0"
              />

              <a-entity id="af-stat-time" material="opacity: 0" position="-0.40 0.20 0.01">
                <a-image
                  src="#af-img-heure"
                  material="shader: flat; transparent: true"
                  position="-0.15 0 0"
                  width="0.11"
                  height="0.11"
                />
                <a-text
                  id="af-time"
                  value="11:25"
                  position="-0.05 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              <a-entity id="af-stat-altitude" material="opacity: 0" position="-1.50 -0.10 0.01">
                <a-image
                  src="#af-img-alti"
                  material="shader: flat; transparent: true"
                  position="-0.20 0 0"
                  width="0.10"
                  height="0.10"
                />
                <a-text
                  id="af-altitude"
                  value="2145m"
                  position="-0.10 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              <a-entity id="af-stat-duration" material="opacity: 0" position="-2.50 -0.55 0.01">
                <a-image
                  src="#af-img-nuit"
                  material="shader: flat; transparent: true"
                  position="-0.15 0 0"
                  width="0.11"
                  height="0.11"
                />
                <a-text
                  id="af-duration"
                  value="7H20"
                  position="-0.05 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              <a-entity id="af-stat-bpm" material="opacity: 0" position="0.50 0.20 0.01">
                <a-image
                  src="#af-img-bpm"
                  material="shader: flat; transparent: true"
                  position="0 0 0"
                  width="0.11"
                  height="0.11"
                />
                <a-text
                  id="af-bpm"
                  value={`${bpm}bpm`}
                  position="0.10 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              <a-entity id="af-stat-temp" material="opacity: 0" position="1.50 -0.10 0.01">
                <a-image
                  src="#af-img-temp"
                  material="shader: flat; transparent: true"
                  position="0 0 0"
                  width="0.11"
                  height="0.11"
                />
                <a-text
                  id="af-temp-obj"
                  value="33.1°C"
                  position="0.10 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              <a-entity id="af-stat-meteo" material="opacity: 0" position="2.50 -0.55 0.01">
                <a-image
                  src="#af-img-meteo"
                  material="shader: flat; transparent: true"
                  position="0 0 0"
                  width="0.11"
                  height="0.11"
                />
                <a-text
                  id="af-temp-amb"
                  value="-6.5°C"
                  position="0.10 0 0"
                  color={COL}
                  font="kelsonsans"
                  width="3.5"
                  align="left"
                  baseline="center"
                />
              </a-entity>

              {isVrMode && (
                <a-entity
                  id="af-exit-vr-button"
                  class="af-clickable"
                  geometry="primitive: plane; width: 0.36; height: 0.20"
                  material="color: #10242c; opacity: 0.5; shader: flat"
                  position="-2.8 0.65 0.02"
                >
                  <a-text
                    value="X EXIT"
                    color="#FF8A84"
                    align="center"
                    baseline="center"
                    font="kelsonsans"
                    width="2.2"
                    position="0 0 0.01"
                  />
                </a-entity>
              )}

              {alertMode === "breathing" && (
                <a-entity id="af-breathing-alert">
                  <a-text
                    value="BPM CRITIQUE"
                    color="#F7D716"
                    align="left"
                    width="2.2"
                    position="0.42 0.36 0.03"
                  />
                  <a-entity position="0 -0.50 0.03">
                    <a-ring
                      radius-inner="0.14"
                      radius-outer="0.152"
                      theta-start="-54"
                      theta-length="144"
                      material="shader: flat; color: #63D471; opacity: 0.9"
                    />
                    <a-ring
                      radius-inner="0.14"
                      radius-outer="0.152"
                      theta-start="90"
                      theta-length="216"
                      material="shader: flat; color: #5DADE2; opacity: 0.9"
                    />
                    <a-entity
                      animation={`property: rotation; from: 0 0 0; to: 0 0 -360; dur: ${BREATH_CYCLE_MS}; loop: true; easing: linear`}
                    >
                      <a-box
                        width="0.009"
                        height="0.16"
                        depth="0.01"
                        position="0 0.08 0.01"
                        material="shader: flat; color: #FFF7DA; opacity: 0.95"
                      />
                    </a-entity>
                    <a-circle
                      radius="0.016"
                      material="shader: flat; color: #FFF7DA; opacity: 0.95"
                    />
                    <a-text
                      value={breathInstruction}
                      color="#FFF7DA"
                      align="center"
                      width="2.0"
                      position="0 -0.24 0.01"
                    />
                  </a-entity>
                </a-entity>
              )}
            </a-entity>

            <a-entity
              id="af-play-button"
              class="af-clickable"
              visible={!isLoading && !isPlaying ? "true" : "false"}
            >
              <a-image
                src="#af-img-play-button"
                material="shader: flat; transparent: true; alphaTest: 0.02"
                position="0 0 -1.6"
                width="0.9"
                height="0.9"
              />
              <a-text
                value="PLAY"
                color="#ffffff"
                align="center"
                width="2"
                position="0 -0.58 -1.6"
              />
              <a-text
                value="Cliquer ou appuyer sur Espace"
                color="#6AD2CA"
                align="center"
                width="3.2"
                position="0 -0.70 -1.6"
              />
            </a-entity>

            {isLoading && (
              <a-text
                value={`Chargement ${progress}%`}
                color="#6AD2CA"
                align="center"
                width="3"
                position="0 0 -1.6"
              />
            )}
          </a-camera>
        </a-entity>
      </a-scene>
    </div>
  );
}
