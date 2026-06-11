import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─── Types & Constants ───────────────────────────────────────── */

type PhaseKey = 'INHALE' | 'HOLD' | 'EXHALE' | 'REST';

type Phase = {
  key: PhaseKey;
  label: string;
  duration: number;
  color: string;
};

type Settings = {
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
  rounds: number;
};

type DraftSettings = { [K in keyof Settings]: string };

const STORAGE_KEY = '@breathsync_settings_v1';

const DEFAULT: Settings = { inhale: 4, hold: 4, exhale: 6, rest: 2, rounds: 5 };

const PHASE_COLORS: Record<PhaseKey, string> = {
  INHALE: '#00E5FF',
  HOLD:   '#FFD700',
  EXHALE: '#B040FF',
  REST:   '#9E9E9E',
};

function makePhases(s: Settings): Phase[] {
  return [
    { key: 'INHALE', label: 'INHALE', duration: s.inhale, color: PHASE_COLORS.INHALE },
    { key: 'HOLD',   label: 'HOLD',   duration: s.hold,   color: PHASE_COLORS.HOLD   },
    { key: 'EXHALE', label: 'EXHALE', duration: s.exhale, color: PHASE_COLORS.EXHALE },
    { key: 'REST',   label: 'REST',   duration: s.rest,   color: PHASE_COLORS.REST   },
  ];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function parseDraft(d: DraftSettings): Settings {
  return {
    inhale: clamp(parseInt(d.inhale)  || DEFAULT.inhale,  1, 99),
    hold:   clamp(parseInt(d.hold)    || DEFAULT.hold,    1, 99),
    exhale: clamp(parseInt(d.exhale)  || DEFAULT.exhale,  1, 99),
    rest:   clamp(parseInt(d.rest)    || DEFAULT.rest,    1, 99),
    rounds: clamp(parseInt(d.rounds)  || DEFAULT.rounds,  1, 20),
  };
}

function toDraft(s: Settings): DraftSettings {
  return {
    inhale: String(s.inhale),
    hold:   String(s.hold),
    exhale: String(s.exhale),
    rest:   String(s.rest),
    rounds: String(s.rounds),
  };
}

/* ─── SVG Paths ───────────────────────────────────────────────── */

const { width: SCREEN_W } = Dimensions.get('window');
const SVG_W = Math.min(SCREEN_W - 32, 300);
const SVG_H = SVG_W * 1.1;

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

const RING_R    = 34;
const RING_CIRC = 2 * Math.PI * RING_R;

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG      = Animated.createAnimatedComponent(G);

/* ─── App ─────────────────────────────────────────────────────── */

export default function App() {

  /* Settings */
  const [settings, setSettings]       = useState<Settings>(DEFAULT);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft]             = useState<DraftSettings>(toDraft(DEFAULT));
  const phasesRef                     = useRef<Phase[]>(makePhases(DEFAULT));
  const totalRoundsRef                = useRef(DEFAULT.rounds);

  /* Session state */
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [round, setRound]             = useState(1);
  const [countdown, setCountdown]     = useState(DEFAULT.inhale);
  const [isRunning, setIsRunning]     = useState(false);
  const [hasStarted, setHasStarted]   = useState(false);
  const [isComplete, setIsComplete]   = useState(false);
  const [totalSecs, setTotalSecs]     = useState(0);

  /* Timer refs */
  const phaseIdxRef  = useRef(0);
  const roundRef     = useRef(1);
  const secsLeftRef  = useRef<number>(DEFAULT.inhale);
  const totalSecsRef = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Animation shared values */
  const scaleX      = useSharedValue(1);
  const scaleY      = useSharedValue(1);
  const lungOpacity = useSharedValue(1);
  const fillProg    = useSharedValue(0);
  const airDash     = useSharedValue(0);
  const ringProg    = useSharedValue(0);

  /* Load settings from storage on mount */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = parseDraft(toDraft(JSON.parse(raw) as Settings));
        phasesRef.current    = makePhases(saved);
        totalRoundsRef.current = saved.rounds;
        setSettings(saved);
        setDraft(toDraft(saved));
        setCountdown(saved.inhale);
        secsLeftRef.current = saved.inhale;
      } catch {}
    });
  }, []);

  /* Animations */
  const triggerAnim = useCallback((pIdx: number, durMs?: number) => {
    const phase = phasesRef.current[pIdx];
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
        airDash.value     = 0;
        airDash.value     = withTiming(80, { duration: dur });
        break;
      case 'HOLD':
        lungOpacity.value = withRepeat(
          withSequence(withTiming(0.82, { duration: 700 }), withTiming(1, { duration: 700 })),
          -1, false,
        );
        break;
      case 'EXHALE':
        scaleX.value      = withTiming(1, { duration: dur, easing: ease });
        scaleY.value      = withTiming(1, { duration: dur, easing: ease });
        fillProg.value    = withTiming(0, { duration: dur });
        lungOpacity.value = withTiming(1, { duration: 200 });
        break;
      case 'REST':
        lungOpacity.value = withRepeat(
          withSequence(withTiming(0.88, { duration: 420 }), withTiming(1, { duration: 420 })),
          -1, false,
        );
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAnims = useCallback(() => {
    cancelAnimation(scaleX);
    cancelAnimation(scaleY);
    cancelAnimation(lungOpacity);
    cancelAnimation(fillProg);
    cancelAnimation(airDash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetSession = useCallback(() => {
    clearTimer();
    stopAnims();
    cancelAnimation(ringProg);
    setIsRunning(false);
    setHasStarted(false);
    setIsComplete(false);
    setPhaseIdx(0);
    setRound(1);
    const firstDur = phasesRef.current[0].duration;
    setCountdown(firstDur);
    setTotalSecs(0);
    phaseIdxRef.current  = 0;
    roundRef.current     = 1;
    secsLeftRef.current  = firstDur;
    totalSecsRef.current = 0;
    scaleX.value         = withTiming(1, { duration: 500 });
    scaleY.value         = withTiming(1, { duration: 500 });
    lungOpacity.value    = 1;
    fillProg.value       = withTiming(0, { duration: 500 });
    ringProg.value       = withTiming(0, { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, stopAnims]);

  /* Timer interval */
  useEffect(() => {
    if (!isRunning) { clearTimer(); return; }

    intervalRef.current = setInterval(() => {
      secsLeftRef.current  -= 1;
      totalSecsRef.current += 1;

      const phases   = phasesRef.current;
      const phaseDur = phases[phaseIdxRef.current].duration;
      const elapsed  = phaseDur - secsLeftRef.current;
      ringProg.value = withTiming(Math.min(elapsed / phaseDur, 1), { duration: 950 });

      if (secsLeftRef.current <= 0) {
        const nextIdx = (phaseIdxRef.current + 1) % phases.length;

        if (nextIdx === 0 && roundRef.current >= totalRoundsRef.current) {
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
        secsLeftRef.current = phases[nextIdx].duration;
        ringProg.value      = 0;
        setPhaseIdx(nextIdx);
        setCountdown(phases[nextIdx].duration);
        triggerAnim(nextIdx);
      } else {
        setCountdown(secsLeftRef.current);
      }

      setTotalSecs(totalSecsRef.current);
    }, 1000);

    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, clearTimer]);

  /* Main button */
  const handlePress = useCallback(() => {
    if (isComplete) return;
    if (!isRunning) {
      triggerAnim(phaseIdxRef.current, secsLeftRef.current * 1000);
      setHasStarted(true);
      setIsRunning(true);
    } else {
      stopAnims();
      setIsRunning(false);
    }
  }, [isRunning, isComplete, triggerAnim, stopAnims]);

  /* Settings handlers */
  const openSettings = useCallback(() => {
    if (isRunning) { stopAnims(); setIsRunning(false); }
    setDraft(toDraft(settings));
    setSettingsOpen(true);
  }, [isRunning, settings, stopAnims]);

  const saveSettings = useCallback(async () => {
    const parsed = parseDraft(draft);
    phasesRef.current      = makePhases(parsed);
    totalRoundsRef.current = parsed.rounds;
    setSettings(parsed);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    setSettingsOpen(false);
    resetSession();
  }, [draft, resetSession]);

  const resetDefaults = useCallback(() => setDraft(toDraft(DEFAULT)), []);

  /* Animated props */
  const leftGrpProps = useAnimatedProps(() => {
    const sx = scaleX.value, sy = scaleY.value;
    return {
      transform: `translate(${95 * (1 - sx)},${98 * (1 - sy)}) scale(${sx},${sy})`,
      opacity: lungOpacity.value,
    };
  });

  const rightGrpProps = useAnimatedProps(() => {
    const sx = scaleX.value, sy = scaleY.value;
    return {
      transform: `translate(${205 * (1 - sx)},${98 * (1 - sy)}) scale(${sx},${sy})`,
      opacity: lungOpacity.value,
    };
  });

  const leftOverlay  = useAnimatedProps(() => ({ opacity: fillProg.value * 0.88 }));
  const rightOverlay = useAnimatedProps(() => ({ opacity: fillProg.value * 0.88 }));
  const airflowL     = useAnimatedProps(() => ({ strokeDashoffset: -airDash.value }));
  const airflowR     = useAnimatedProps(() => ({ strokeDashoffset: -airDash.value }));
  const ringCircle   = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - ringProg.value),
  }));

  /* Derived display values */
  const phase       = phasesRef.current[phaseIdx];
  const mins        = Math.floor(totalSecs / 60);
  const secs        = totalSecs % 60;
  const pct         = Math.round(((phase.duration - countdown) / phase.duration) * 100);
  const btnLabel    = !hasStarted ? 'START' : isRunning ? 'PAUSE' : 'RESUME';
  const perRound    = (parseInt(draft.inhale) || 0) + (parseInt(draft.hold) || 0) +
                      (parseInt(draft.exhale) || 0) + (parseInt(draft.rest) || 0);
  const fullSession = perRound * (parseInt(draft.rounds) || 0);

  /* ─── SETTINGS MODAL ──────────────────────────────────────── */
  const renderSettings = () => (
    <Modal
      visible={settingsOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setSettingsOpen(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.kav}
          >
            <View style={s.sheet}>
              {/* Sheet header */}
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Customize Session</Text>
                <TouchableOpacity onPress={() => setSettingsOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={s.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 2×2 Phase grid */}
                <View style={s.inputGrid}>
                  {(['inhale', 'hold', 'exhale', 'rest'] as const).map(key => (
                    <View key={key} style={s.inputCell}>
                      <Text style={[s.cellLabel, { color: PHASE_COLORS[key.toUpperCase() as PhaseKey] }]}>
                        {key.toUpperCase()}
                      </Text>
                      <TextInput
                        style={s.inputBox}
                        value={draft[key]}
                        onChangeText={v =>
                          setDraft(d => ({ ...d, [key]: v.replace(/[^0-9]/g, '') }))
                        }
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                        placeholderTextColor="#444"
                      />
                      <Text style={s.cellUnit}>sec</Text>
                    </View>
                  ))}
                </View>

                {/* Rounds row + totals */}
                <View style={s.roundsRow}>
                  <View style={s.inputCell}>
                    <Text style={[s.cellLabel, { color: '#AAAACC' }]}>ROUNDS</Text>
                    <TextInput
                      style={s.inputBox}
                      value={draft.rounds}
                      onChangeText={v =>
                        setDraft(d => ({ ...d, rounds: v.replace(/[^0-9]/g, '') }))
                      }
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      placeholderTextColor="#444"
                    />
                    <Text style={s.cellUnit}>rounds</Text>
                  </View>

                  <View style={s.totalsBlock}>
                    <View style={s.totalRow}>
                      <Text style={s.totalLabel}>Per round</Text>
                      <Text style={s.totalValue}>{perRound}s</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.totalRow}>
                      <Text style={s.totalLabel}>Full session</Text>
                      <Text style={[s.totalValue, { color: '#00E5FF' }]}>{fullSession}s</Text>
                    </View>
                  </View>
                </View>

                {/* Action buttons */}
                <TouchableOpacity style={s.saveBtn} onPress={saveSettings} activeOpacity={0.8}>
                  <Text style={s.saveBtnText}>SAVE  &  APPLY</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.defaultsBtn} onPress={resetDefaults} activeOpacity={0.7}>
                  <Text style={s.defaultsBtnText}>Reset to Defaults</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  /* ─── COMPLETION SCREEN ───────────────────────────────────── */
  if (isComplete) {
    const sessionTotal = phasesRef.current.reduce((a, p) => a + p.duration, 0) * totalRoundsRef.current;
    return (
      <LinearGradient colors={['#0D0B1E', '#1A0538']} style={s.root}>
        <StatusBar barStyle="light-content" />
        {renderSettings()}
        <View style={s.completeWrap}>
          <Text style={s.completeTitle}>Session{'\n'}Complete</Text>
          <View style={s.checkCircle}>
            <Text style={s.checkMark}>✓</Text>
          </View>
          <Text style={s.completeTime}>{mins}:{secs.toString().padStart(2, '0')}</Text>
          <Text style={s.completeDetail}>
            {totalRoundsRef.current} rounds · {sessionTotal}s breathing
          </Text>
          <TouchableOpacity style={s.againBtn} onPress={resetSession} activeOpacity={0.75}>
            <Text style={s.againText}>BREATHE AGAIN</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  /* ─── MAIN SCREEN ─────────────────────────────────────────── */
  return (
    <LinearGradient colors={['#0D0B1E', '#1A0538']} style={s.root}>
      <StatusBar barStyle="light-content" />
      {renderSettings()}

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🫁 Breathe Easy</Text>
        <TouchableOpacity
          onPress={openSettings}
          style={s.gearBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.roundLabel}>ROUND {round} OF {totalRoundsRef.current}</Text>
      <Text style={[s.phaseLabel, { color: phase.color }]}>{phase.label}</Text>

      {/* Lung anatomy */}
      <View style={{ width: SVG_W, height: SVG_H }}>
        <Svg width={SVG_W} height={SVG_H} viewBox="0 0 300 330">
          <Path d="M 150 12 L 150 80" stroke="#7A9EC4" strokeWidth="7" strokeLinecap="round" fill="none" />
          <Path d="M 150 78 Q 118 90 95 100" stroke="#7A9EC4" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          <Path d="M 150 78 Q 182 90 205 100" stroke="#7A9EC4" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          <AnimatedPath d="M 150 12 L 150 78 Q 118 90 95 100"
            stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round"
            fill="none" strokeDasharray="5 14" animatedProps={airflowL} />
          <AnimatedPath d="M 150 12 L 150 78 Q 182 90 205 100"
            stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round"
            fill="none" strokeDasharray="5 14" animatedProps={airflowR} />
          <AnimatedG animatedProps={leftGrpProps}>
            <Path d={L_LUNG} fill="#0A2E5E" stroke="#1B5FA0" strokeWidth="1.5" />
            <AnimatedPath d={L_LUNG} fill="#0A9060" stroke="#2AE8A8" strokeWidth="0.8" animatedProps={leftOverlay} />
            {L_AIRWAYS.map((d, i) => (
              <Path key={i} d={d} stroke="#2468AE" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.5} />
            ))}
          </AnimatedG>
          <AnimatedG animatedProps={rightGrpProps}>
            <Path d={R_LUNG} fill="#0A2E5E" stroke="#1B5FA0" strokeWidth="1.5" />
            <AnimatedPath d={R_LUNG} fill="#0A9060" stroke="#2AE8A8" strokeWidth="0.8" animatedProps={rightOverlay} />
            {R_AIRWAYS.map((d, i) => (
              <Path key={i} d={d} stroke="#2468AE" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.5} />
            ))}
          </AnimatedG>
        </Svg>
      </View>

      <Text style={[s.countdown, { color: phase.color }]}>{countdown}</Text>

      <View style={s.ringWrap}>
        <Svg width={84} height={84}>
          <Circle cx="42" cy="42" r={RING_R} stroke="#1A1A3A" strokeWidth="5" fill="none" />
          <AnimatedCircle cx="42" cy="42" r={RING_R}
            stroke={phase.color} strokeWidth="5" fill="none"
            strokeDasharray={RING_CIRC} strokeLinecap="round"
            rotation="-90" origin="42, 42"
            animatedProps={ringCircle} />
        </Svg>
        <Text style={[s.ringPct, { color: phase.color }]}>{pct}%</Text>
      </View>

      <Text style={s.tipText}>Breathe in sync with the lungs</Text>

      <TouchableOpacity style={[s.mainBtn, { borderColor: phase.color }]}
        onPress={handlePress} activeOpacity={0.75}>
        <Text style={[s.mainBtnText, { color: phase.color }]}>{btnLabel}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerTitle: { color: '#8888BB', fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  gearBtn:     { padding: 4 },
  gearIcon:    { fontSize: 20 },

  /* Main session */
  roundLabel: { color: '#555580', fontSize: 11, letterSpacing: 3, marginBottom: 4 },
  phaseLabel: { fontSize: 26, fontWeight: '700', letterSpacing: 7, marginBottom: 10 },
  countdown:  { fontSize: 52, fontWeight: '200', letterSpacing: 3, marginBottom: 6 },
  ringWrap:   { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ringPct:    { position: 'absolute', fontSize: 13, fontWeight: '500' },
  tipText:    { color: '#3E3E68', fontSize: 12, letterSpacing: 0.4, marginBottom: 24 },
  mainBtn:    { borderWidth: 1.5, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 56 },
  mainBtnText:{ fontSize: 15, fontWeight: '700', letterSpacing: 4 },

  /* Completion */
  completeWrap:   { alignItems: 'center', paddingHorizontal: 24 },
  completeTitle:  { color: '#EEEEFF', fontSize: 28, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 24 },
  checkCircle:    { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#2AE8A8', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  checkMark:      { color: '#2AE8A8', fontSize: 46, lineHeight: 54 },
  completeTime:   { color: '#00E5FF', fontSize: 42, fontWeight: '200', letterSpacing: 2, marginBottom: 6 },
  completeDetail: { color: '#5A5A8A', fontSize: 14, marginBottom: 40 },
  againBtn:       { borderWidth: 1.5, borderColor: '#00E5FF', borderRadius: 40, paddingVertical: 14, paddingHorizontal: 48 },
  againText:      { color: '#00E5FF', fontSize: 14, fontWeight: '700', letterSpacing: 3 },

  /* Settings modal */
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  kav:       { width: '100%' },
  sheet:     { backgroundColor: '#12102A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, maxHeight: '90%' },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  sheetTitle: { color: '#EEEEFF', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  sheetClose: { color: '#6666AA', fontSize: 18, fontWeight: '600' },

  /* Input grid */
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  inputCell: { width: '46%', alignItems: 'center', marginBottom: 20 },
  cellLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 8 },
  inputBox:  {
    width: 80, height: 56,
    borderWidth: 1.5, borderColor: '#2A2A5A', borderRadius: 12,
    backgroundColor: '#0D0B2A',
    color: '#EEEEFF', fontSize: 26, fontWeight: '300',
    textAlign: 'center',
  },
  cellUnit:  { color: '#4444AA', fontSize: 11, letterSpacing: 1, marginTop: 6 },

  /* Rounds row */
  roundsRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  totalsBlock: { flex: 1, marginLeft: 20, backgroundColor: '#0A0920', borderRadius: 12, padding: 14 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:  { color: '#4444AA', fontSize: 12 },
  totalValue:  { color: '#8888CC', fontSize: 16, fontWeight: '600' },
  divider:     { height: 1, backgroundColor: '#1A1A3A', marginVertical: 8 },

  /* Settings buttons */
  saveBtn:      { backgroundColor: '#1A3A6A', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  saveBtnText:  { color: '#00E5FF', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  defaultsBtn:  { paddingVertical: 12, alignItems: 'center' },
  defaultsBtnText: { color: '#444466', fontSize: 13, letterSpacing: 1 },
});
