import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedProps,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const SVG_W = Math.min(SCREEN_W - 32, 300);
const SVG_H = SVG_W * 1.1;

const PHASES = [
  { key: 'INHALE', label: 'INHALE', duration: 4, color: '#00E5FF' },
  { key: 'HOLD',   label: 'HOLD',   duration: 4, color: '#FFD700' },
  { key: 'EXHALE', label: 'EXHALE', duration: 6, color: '#B040FF' },
  { key: 'REST',   label: 'REST',   duration: 2, color: '#9E9E9E' },
] as const;

const TOTAL_ROUNDS = 5;
const RING_R = 34;
const RING_CIRC = 2 * Math.PI * RING_R;

// Anatomical lung paths — viewBox 0 0 300 330
const L_LUNG =
  'M 95 98 C 75 93,42 108,32 145 C 22 182,26 222,40 258 ' +
  'C 52 286,75 300,102 298 C 125 296,138 280,140 255 ' +
  'C 143 220,142 182,140 148 C 138 125,118 100,95 98 Z';

const R_LUNG =
  'M 205 98 C 225 93,258 108,268 145 C 278 182,274 222,260 258 ' +
  'C 248 286,225 300,198 298 C 175 296,162 280,160 255 ' +
  'C 157 220,158 182,160 148 C 162 125,182 100,205 98 Z';

const L_AIRWAYS = [
  'M 95 98 Q 88 125 80 155',
  'M 95 98 Q 108 118 112 148',
  'M 80 155 Q 70 182 64 215',
  'M 112 148 Q 122 170 125 198',
  'M 80 155 Q 82 180 76 210',
];

const R_AIRWAYS = [
  'M 205 98 Q 212 125 220 155',
  'M 205 98 Q 192 118 188 148',
  'M 220 155 Q 230 182 236 215',
  'M 188 148 Q 178 170 175 198',
  'M 220 155 Q 218 180 224 210',
];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export default function App() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [round, setRound]       = useState(1);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalSecs, setTotalSecs]   = useState(0);

  const phaseIdxRef  = useRef(0);
  const roundRef     = useRef(1);
  const secsLeftRef  = useRef<number>(PHASES[0].duration);
  const totalSecsRef = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared animation values
  const scaleX      = useSharedValue(1);
  const scaleY      = useSharedValue(1);
  const lungOpacity = useSharedValue(1);
  const fillProg    = useSharedValue(0);   // 0 = dark blue, 1 = cyan-green
  const airDash     = useSharedValue(0);
  const ringProg    = useSharedValue(0);

  const triggerAnim = useCallback(
    (pIdx: number, durMs?: number) => {
      const phase = PHASES[pIdx];
      const dur   = durMs ?? phase.duration * 1000;
      const ease  = Easing.bezier(0.42, 0, 0.58, 1);

      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(lungOpacity);
      cancelAnimation(fillProg);
      cancelAnimation(airDash);

      switch (phase.key) {
        case 'INHALE':
          scaleX.value      = withTiming(1.18, { duration: dur, easing: ease });
          scaleY.value      = withTiming(1.15, { duration: dur, easing: ease });
          fillProg.value    = withTiming(1, { duration: dur });
          lungOpacity.value = withTiming(1, { duration: 200 });
          airDash.value = 0;
          airDash.value = withTiming(80, { duration: dur });
          break;
        case 'HOLD':
          lungOpacity.value = withRepeat(
            withSequence(
              withTiming(0.82, { duration: 700 }),
              withTiming(1.0,  { duration: 700 }),
            ),
            -1,
            false,
          );
          break;
        case 'EXHALE':
          scaleX.value      = withTiming(1,   { duration: dur, easing: ease });
          scaleY.value      = withTiming(1,   { duration: dur, easing: ease });
          fillProg.value    = withTiming(0,   { duration: dur });
          lungOpacity.value = withTiming(1,   { duration: 200 });
          break;
        case 'REST':
          lungOpacity.value = withRepeat(
            withSequence(
              withTiming(0.88, { duration: 420 }),
              withTiming(1.0,  { duration: 420 }),
            ),
            -1,
            false,
          );
          break;
      }
    },
    // shared values are stable refs — empty dep array is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      secsLeftRef.current  -= 1;
      totalSecsRef.current += 1;

      const phaseDur = PHASES[phaseIdxRef.current].duration;
      const elapsed  = phaseDur - secsLeftRef.current;
      ringProg.value = withTiming(Math.min(elapsed / phaseDur, 1), { duration: 950 });

      if (secsLeftRef.current <= 0) {
        const nextIdx = (phaseIdxRef.current + 1) % PHASES.length;

        if (nextIdx === 0 && roundRef.current >= TOTAL_ROUNDS) {
          clearTimer();
          setIsRunning(false);
          setIsComplete(true);
          setTotalSecs(totalSecsRef.current);
          return;
        }

        if (nextIdx === 0) {
          roundRef.current += 1;
          setRound(roundRef.current);
        }

        phaseIdxRef.current = nextIdx;
        secsLeftRef.current = PHASES[nextIdx].duration;
        ringProg.value      = 0;

        setPhaseIdx(nextIdx);
        setCountdown(PHASES[nextIdx].duration);
        triggerAnim(nextIdx);
      } else {
        setCountdown(secsLeftRef.current);
      }

      setTotalSecs(totalSecsRef.current);
    }, 1000);

    return clearTimer;
  // triggerAnim and ringProg are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, clearTimer]);

  const handlePress = useCallback(() => {
    if (isComplete) return;
    if (!isRunning) {
      triggerAnim(phaseIdxRef.current, secsLeftRef.current * 1000);
      setHasStarted(true);
      setIsRunning(true);
    } else {
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(lungOpacity);
      cancelAnimation(fillProg);
      cancelAnimation(airDash);
      setIsRunning(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isComplete, triggerAnim]);

  const handleReset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setHasStarted(false);
    setIsComplete(false);
    setPhaseIdx(0);
    setRound(1);
    setCountdown(PHASES[0].duration);
    setTotalSecs(0);
    phaseIdxRef.current  = 0;
    roundRef.current     = 1;
    secsLeftRef.current  = PHASES[0].duration;
    totalSecsRef.current = 0;

    cancelAnimation(scaleX);
    cancelAnimation(scaleY);
    cancelAnimation(lungOpacity);
    cancelAnimation(fillProg);
    cancelAnimation(airDash);
    cancelAnimation(ringProg);
    scaleX.value      = withTiming(1, { duration: 500 });
    scaleY.value      = withTiming(1, { duration: 500 });
    lungOpacity.value = 1;
    fillProg.value    = withTiming(0, { duration: 500 });
    ringProg.value    = withTiming(0, { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer]);

  // Left lung group — scales from bronchus origin (95, 98)
  const leftGrpProps = useAnimatedProps(() => {
    const sx = scaleX.value;
    const sy = scaleY.value;
    return {
      transform: `translate(${95 * (1 - sx)},${98 * (1 - sy)}) scale(${sx},${sy})`,
      opacity: lungOpacity.value,
    };
  });

  // Right lung group — scales from bronchus origin (205, 98)
  const rightGrpProps = useAnimatedProps(() => {
    const sx = scaleX.value;
    const sy = scaleY.value;
    return {
      transform: `translate(${205 * (1 - sx)},${98 * (1 - sy)}) scale(${sx},${sy})`,
      opacity: lungOpacity.value,
    };
  });

  // Cyan-green overlay fades in as lungs fill with air
  const leftOverlay  = useAnimatedProps(() => ({ opacity: fillProg.value * 0.88 }));
  const rightOverlay = useAnimatedProps(() => ({ opacity: fillProg.value * 0.88 }));

  // Airflow dashes travel down trachea → bronchi during inhale
  const airflowL = useAnimatedProps(() => ({ strokeDashoffset: -airDash.value }));
  const airflowR = useAnimatedProps(() => ({ strokeDashoffset: -airDash.value }));

  // Progress ring fills as phase advances
  const ringCircle = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - ringProg.value),
  }));

  const phase   = PHASES[phaseIdx];
  const mins    = Math.floor(totalSecs / 60);
  const secs    = totalSecs % 60;
  const pct     = Math.round(((phase.duration - countdown) / phase.duration) * 100);
  const btnLabel = !hasStarted ? 'START' : isRunning ? 'PAUSE' : 'RESUME';

  /* ─── COMPLETION SCREEN ─────────────────────────────────── */
  if (isComplete) {
    return (
      <LinearGradient colors={['#0D0B1E', '#1A0538']} style={s.root}>
        <StatusBar barStyle="light-content" />
        <View style={s.completeWrap}>
          <Text style={s.completeTitle}>Session{'\n'}Complete</Text>
          <View style={s.checkCircle}>
            <Text style={s.checkMark}>✓</Text>
          </View>
          <Text style={s.completeTime}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
          <Text style={s.completeDetail}>
            {TOTAL_ROUNDS} rounds · 80 seconds
          </Text>
          <TouchableOpacity style={s.againBtn} onPress={handleReset} activeOpacity={0.75}>
            <Text style={s.againText}>BREATHE AGAIN</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  /* ─── MAIN SCREEN ────────────────────────────────────────── */
  return (
    <LinearGradient colors={['#0D0B1E', '#1A0538']} style={s.root}>
      <StatusBar barStyle="light-content" />

      <Text style={s.roundLabel}>ROUND {round} OF {TOTAL_ROUNDS}</Text>
      <Text style={[s.phaseLabel, { color: phase.color }]}>{phase.label}</Text>

      {/* ── Lung Anatomy ── */}
      <View style={{ width: SVG_W, height: SVG_H }}>
        <Svg width={SVG_W} height={SVG_H} viewBox="0 0 300 330">

          {/* Trachea */}
          <Path d="M 150 12 L 150 80" stroke="#7A9EC4" strokeWidth="7"
            strokeLinecap="round" fill="none" />

          {/* Left bronchus */}
          <Path d="M 150 78 Q 118 90 95 100" stroke="#7A9EC4" strokeWidth="5.5"
            strokeLinecap="round" fill="none" />

          {/* Right bronchus */}
          <Path d="M 150 78 Q 182 90 205 100" stroke="#7A9EC4" strokeWidth="5.5"
            strokeLinecap="round" fill="none" />

          {/* Animated airflow — left */}
          <AnimatedPath
            d="M 150 12 L 150 78 Q 118 90 95 100"
            stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round"
            fill="none" strokeDasharray="5 14"
            animatedProps={airflowL}
          />

          {/* Animated airflow — right */}
          <AnimatedPath
            d="M 150 12 L 150 78 Q 182 90 205 100"
            stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round"
            fill="none" strokeDasharray="5 14"
            animatedProps={airflowR}
          />

          {/* Left lung */}
          <AnimatedG animatedProps={leftGrpProps}>
            {/* Base deep-blue fill */}
            <Path d={L_LUNG} fill="#0A2E5E" stroke="#1B5FA0" strokeWidth="1.5" />
            {/* Cyan-green overlay animates in as air fills */}
            <AnimatedPath d={L_LUNG} fill="#0A9060" stroke="#2AE8A8"
              strokeWidth="0.8" animatedProps={leftOverlay} />
            {/* Internal branching airways */}
            {L_AIRWAYS.map((d, i) => (
              <Path key={i} d={d} stroke="#2468AE" strokeWidth="1.1"
                strokeLinecap="round" fill="none" opacity={0.5} />
            ))}
          </AnimatedG>

          {/* Right lung */}
          <AnimatedG animatedProps={rightGrpProps}>
            <Path d={R_LUNG} fill="#0A2E5E" stroke="#1B5FA0" strokeWidth="1.5" />
            <AnimatedPath d={R_LUNG} fill="#0A9060" stroke="#2AE8A8"
              strokeWidth="0.8" animatedProps={rightOverlay} />
            {R_AIRWAYS.map((d, i) => (
              <Path key={i} d={d} stroke="#2468AE" strokeWidth="1.1"
                strokeLinecap="round" fill="none" opacity={0.5} />
            ))}
          </AnimatedG>
        </Svg>
      </View>

      {/* ── Countdown ── */}
      <Text style={[s.countdown, { color: phase.color }]}>{countdown}</Text>

      {/* ── Progress ring ── */}
      <View style={s.ringWrap}>
        <Svg width={84} height={84}>
          <Circle cx="42" cy="42" r={RING_R} stroke="#1A1A3A"
            strokeWidth="5" fill="none" />
          <AnimatedCircle
            cx="42" cy="42" r={RING_R}
            stroke={phase.color} strokeWidth="5" fill="none"
            strokeDasharray={RING_CIRC}
            strokeLinecap="round"
            rotation="-90" origin="42, 42"
            animatedProps={ringCircle}
          />
        </Svg>
        <Text style={[s.ringPct, { color: phase.color }]}>{pct}%</Text>
      </View>

      <Text style={s.tipText}>Breathe in sync with the lungs</Text>

      {/* ── Start / Pause / Resume ── */}
      <TouchableOpacity
        style={[s.mainBtn, { borderColor: phase.color }]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <Text style={[s.mainBtnText, { color: phase.color }]}>{btnLabel}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

/* ─────────────────────────── STYLES ──────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  roundLabel: {
    color: '#555580',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 7,
    marginBottom: 10,
  },
  countdown: {
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: 3,
    marginBottom: 6,
  },
  ringWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ringPct: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '500',
  },
  tipText: {
    color: '#3E3E68',
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 24,
  },
  mainBtn: {
    borderWidth: 1.5,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 56,
  },
  mainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 4,
  },

  // Completion screen
  completeWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completeTitle: {
    color: '#EEEEFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 24,
  },
  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#2AE8A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  checkMark: {
    color: '#2AE8A8',
    fontSize: 46,
    lineHeight: 54,
  },
  completeTime: {
    color: '#00E5FF',
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 2,
    marginBottom: 6,
  },
  completeDetail: {
    color: '#5A5A8A',
    fontSize: 14,
    marginBottom: 40,
  },
  againBtn: {
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  againText: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
