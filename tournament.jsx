import { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { CalendarDays, Trophy, Info, Swords, Crown, Unlock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ===== ERROR BOUNDARY =====
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding:24, fontFamily:"monospace", background:"#fff1f1", color:"#c00", borderRadius:8, margin:16 }}>
        <strong>Error:</strong> {this.state.error.message}
        <pre style={{ marginTop:8, fontSize:11, whiteSpace:"pre-wrap" }}>{this.state.error.stack}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop:12, padding:"6px 16px", background:"#c00", color:"#fff", border:"none", borderRadius:6, cursor:"pointer" }}>Dismiss</button>
      </div>
    );
    return this.props.children;
  }
}

// ===== SUPABASE CLIENT =====
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// ===== TEAM COLORS =====
const TEAM_COLORS = {
  "Team Power ES":    { bg: "#C0392B", accent: "#C0392B", text: "#fff" },
  "Santa Cruz":       { bg: "#1565C0", accent: "#1565C0", text: "#fff" },
  "Soccer Central":   { bg: "#27AE60", accent: "#27AE60", text: "#fff" },
  "Storm Breakers":   { bg: "#8E24AA", accent: "#8E24AA", text: "#fff" },
  "Real Madrid":      { bg: "#F4F4F4", accent: "#D4AF37", text: "#1A1A1A" },
  "Joga Bonito":      { bg: "#F57F17", accent: "#F57F17", text: "#fff" },
  "Baller Zone FC":   { bg: "#00897B", accent: "#00897B", text: "#fff" },
  "Zero Fox Given":   { bg: "#1A1A1A", accent: "#E53935", text: "#fff" },
};

const tc = (team) => TEAM_COLORS[team] || { bg: "#666", accent: "#666", text: "#fff" };

// ===== ADMIN AUTH =====
const ADMIN_HASH = "f2c6d2b655e8ac86521637cc30e7d791c0935952c5965d6bba2cf52ee701df83";
async function checkPassword(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("") === ADMIN_HASH;
}

// ===== SCORE HELPERS =====
function parseScore(score) {
  if (!score || score === "-" || score === "\u2014") return null;
  const m = String(score).match(/^\s*(\d+)\s*[-\u2013\u2014]\s*(\d+)\s*$/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2])];
}

function formatScore(val) {
  const p = parseScore(val);
  return p ? `${p[0]} - ${p[1]}` : (val || "-");
}

// ===== COMPUTE GROUP STANDINGS =====
function computeGroupStandings(group) {
  const stats = {};
  group.teams.forEach(t => { stats[t] = { team:t, gp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 }; });
  group.games.forEach(g => {
    const parsed = parseScore(g.score);
    if (!parsed) return;
    const [hg, ag] = parsed;
    if (stats[g.home]) { stats[g.home].gp++; stats[g.home].gf += hg; stats[g.home].ga += ag; }
    if (stats[g.away]) { stats[g.away].gp++; stats[g.away].gf += ag; stats[g.away].ga += hg; }
    if (hg > ag) { if(stats[g.home]) { stats[g.home].w++; stats[g.home].pts+=3; } if(stats[g.away]) stats[g.away].l++; }
    else if (hg < ag) { if(stats[g.away]) { stats[g.away].w++; stats[g.away].pts+=3; } if(stats[g.home]) stats[g.home].l++; }
    else { if(stats[g.home]) { stats[g.home].d++; stats[g.home].pts++; } if(stats[g.away]) { stats[g.away].d++; stats[g.away].pts++; } }
  });
  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });
  return Object.values(stats).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.ga-b.ga);
}

// ===== DEFAULT TOURNAMENT DATA =====
const DEFAULT_TOURNAMENT = {
  groups: [
    {
      name: "Group A",
      teams: ["Team Power ES", "Santa Cruz", "Real Madrid", "Joga Bonito"],
      games: [
        { home: "Team Power ES", away: "Santa Cruz", time: "6:00", score: "-" },
        { home: "Real Madrid", away: "Joga Bonito", time: "6:44", score: "-" },
        { home: "Team Power ES", away: "Real Madrid", time: "7:28", score: "-" },
        { home: "Santa Cruz", away: "Joga Bonito", time: "8:12", score: "-" },
        { home: "Team Power ES", away: "Joga Bonito", time: "8:56", score: "-" },
        { home: "Santa Cruz", away: "Real Madrid", time: "9:40", score: "-" },
      ]
    },
    {
      name: "Group B",
      teams: ["Soccer Central", "Storm Breakers", "Zero Fox Given", "Baller Zone FC"],
      games: [
        { home: "Soccer Central", away: "Storm Breakers", time: "6:22", score: "-" },
        { home: "Baller Zone FC", away: "Zero Fox Given", time: "7:06", score: "-" },
        { home: "Baller Zone FC", away: "Storm Breakers", time: "7:50", score: "-" },
        { home: "Baller Zone FC", away: "Soccer Central", time: "8:34", score: "-" },
        { home: "Storm Breakers", away: "Zero Fox Given", time: "9:18", score: "-" },
        { home: "Soccer Central", away: "Zero Fox Given", time: "10:02", score: "-" },
      ]
    }
  ],
  semis: [
    { id: "sf1", home: "A1", away: "B2", time: "10:24", score: "-", pens: "", winner: "" },
    { id: "sf2", home: "B1", away: "A2", time: "10:46", score: "-", pens: "", winner: "" },
  ],
  final: { id: "f", home: "SF1 Winner", away: "SF2 Winner", time: "11:08", score: "-", pens: "", winner: "" },
};

// ===== STORAGE HELPERS =====
const _localWrites = new Set();

async function loadStorage(key, defaultVal) {
  try {
    const { data, error } = await supabase
      .from("league_data")
      .select("value")
      .eq("key", key)
      .single();
    if (!error && data) {
      let v = data.value;
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = defaultVal; } }
      localStorage.setItem(key, JSON.stringify(v));
      return v;
    }
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    return defaultVal;
  } catch {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : defaultVal;
  }
}

async function saveStorage(key, val) {
  try {
    _localWrites.add(key);
    setTimeout(() => _localWrites.delete(key), 15000);
    await supabase.from("league_data").upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: "key" });
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e) {
    localStorage.setItem(key, JSON.stringify(val));
    console.error("Supabase save failed:", e);
  }
}

// ===== EDIT FIELD =====
function EditField({ value, onSave, admin, mono, style }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const inp = useRef(null);
  useEffect(() => { setVal(value ?? ""); }, [value]);
  useEffect(() => { if (editing && inp.current) inp.current.focus(); }, [editing]);
  if (!admin) return <span style={{ fontFamily: mono ? "'DM Mono',monospace" : "inherit", ...style }}>{value}</span>;
  if (!editing) return (
    <span onClick={() => setEditing(true)} style={{ cursor:"pointer", borderBottom:"1px dashed #E8B931", fontFamily: mono ? "'DM Mono',monospace" : "inherit", ...style }}>{value || "\u2014"}</span>
  );
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      <input ref={inp} value={val} onChange={e => setVal(e.target.value)}
        style={{ width: Math.max(40, val.length * 9), fontFamily: mono ? "'DM Mono',monospace" : "inherit", fontSize:16, border:"1px solid #E8B931", borderRadius:4, padding:"4px 6px", background:"#fff" }}
        onKeyDown={e => { if(e.key==="Enter"){onSave(val);setEditing(false);} if(e.key==="Escape")setEditing(false);}} />
      <button onClick={() => {onSave(val);setEditing(false);}} style={{ background:"#27AE60", color:"#fff", border:"none", borderRadius:4, padding:"2px 6px", cursor:"pointer", fontSize:14 }}>{"\u2713"}</button>
    </span>
  );
}

// ===== SCORE INPUT =====
function ScoreInput({ score, onSave, admin }) {
  const parsed = parseScore(score);
  const [home, setHome] = useState(parsed ? String(parsed[0]) : "");
  const [away, setAway] = useState(parsed ? String(parsed[1]) : "");

  useEffect(() => {
    const p = parseScore(score);
    setHome(p ? String(p[0]) : "");
    setAway(p ? String(p[1]) : "");
  }, [score]);

  const commit = (h, a) => {
    const hn = parseInt(h), an = parseInt(a);
    if (!isNaN(hn) && !isNaN(an)) onSave(`${hn} - ${an}`);
  };

  const inputStyle = {
    width: 44, height: 44, textAlign: "center",
    fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700,
    border: "1.5px solid #E8B931", borderRadius: 6,
    background: "#fff", outline: "none", padding: 0,
    WebkitAppearance: "none", MozAppearance: "textfield", appearance: "none",
    touchAction: "manipulation",
  };

  if (!admin) {
    const p = parseScore(score);
    return (
      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:14 }}>
        {p ? `${p[0]} - ${p[1]}` : "vs"}
      </span>
    );
  }

  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      <input
        value={home}
        onChange={e => setHome(e.target.value.replace(/\D/g, ""))}
        onBlur={e => commit(e.target.value, away)}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        inputMode="numeric" pattern="[0-9]*" maxLength={2}
        style={inputStyle}
      />
      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:800, color:"#666", fontSize:16, userSelect:"none" }}>{"\u2013"}</span>
      <input
        value={away}
        onChange={e => setAway(e.target.value.replace(/\D/g, ""))}
        onBlur={e => commit(home, e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        inputMode="numeric" pattern="[0-9]*" maxLength={2}
        style={inputStyle}
      />
    </div>
  );
}

// ===== TEAM BADGE =====
function TeamBadge({ team, small }) {
  const c = tc(team);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap: small?4:6, fontSize: small?12:14, fontWeight:600 }}>
      <span style={{ width: small?8:10, height: small?8:10, borderRadius:"50%", background: c.accent, border: c.accent==="#F4F4F4"||c.accent==="#D4AF37" ? "1px solid #ccc":"none", flexShrink:0 }} />
      <span style={{ whiteSpace:"nowrap" }}>{team}</span>
    </span>
  );
}

// ===== BRACKET MATCH CARD =====
function BracketMatchCard({ label, home, away, score, pens, admin, onScoreChange, onPensChange, winner }) {
  const hc = tc(home);
  const ac = tc(away);
  const parsedScore = parseScore(score);
  const isDraw = parsedScore !== null && parsedScore[0] === parsedScore[1];
  return (
    <div style={{ background:"#fff", borderRadius:10, padding:"10px 12px", marginBottom:8, boxShadow:"0 1px 4px rgba(0,0,0,0.1)", border: winner ? "2px solid #E8B931" : "1px solid #e8e5df" }}>
      {label && <div style={{ fontSize:10, fontWeight:700, color:"#E8B931", marginBottom:6, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{label}</div>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:hc.accent, flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight: winner===home?800:500 }}>{home}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:ac.accent, flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight: winner===away?800:500 }}>{away}</span>
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700 }}>
            <ScoreInput score={score} onSave={onScoreChange} admin={admin} />
          </div>
          {pens && <div style={{ fontSize:9, color:"#E8B931", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>PKs: {pens}</div>}
        </div>
      </div>
      {admin && isDraw && (
        <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, background:"#FFF8E1", borderRadius:6, padding:"6px 10px" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#B8860B", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>PKs:</span>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, flex:1 }}>
            <EditField value={pens||""} admin={admin} mono onSave={onPensChange} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== INFO TAB RULES =====
const RULES = [
  {
    title: "Tournament Rules",
    items: [
      "3v3 format, no goalkeepers. Max 6 players per roster.",
      "Group stage: Two 8-minute halves, 2-minute halftime.",
      "Semifinals: Two 8-minute halves, 1-minute halftime.",
      "Final: Two 10-minute halves, 2-minute halftime.",
      "Running clock, no timeouts.",
      "No offsides. Heading is allowed.",
      "Goal box rule: defenders cannot camp inside the goal box for more than 3 seconds. Penalty = uncontested free kick.",
      "Kick-ins (not throw-ins) \u2014 indirect. Corner kicks are direct. Goal kicks are indirect.",
      "Free kicks are indirect, 3-ft distance from the wall. Penalty kicks awarded for denied goal-scoring opportunities.",
      "On-the-fly substitutions at midfield only.",
      "Knockout stage ties resolved by penalty kicks (3 PKs each, then sudden death).",
    ]
  },
  {
    title: "Discipline",
    items: [
      "NO slide tackles (automatic yellow card).",
      "NO spitting (immediate ejection).",
      "NO cleats or studs allowed.",
      "Yellow card: 1st = 30 seconds off the field. 2nd (same game) = 1 minute off. 3rd (same game) = red card.",
      "4 yellow cards accumulated across group stage = 1-game suspension.",
      "Yellow cards reset for the knockout stage.",
      "Red card = 2 minutes short-handed + suspended for the rest of the game + next game.",
      "Forfeits: 5-minute grace period. Forfeit scored as 3-0.",
      "No playing on the ground, no dangerous play, no verbal abuse of referees.",
    ]
  },
  {
    title: "Equipment",
    items: [
      "Size 5 ball provided by FTY LAB.",
      "Indoor or turf shoes only \u2014 no cleats, no studs, no boots.",
      "Shin guards recommended but not required.",
      "No hard casts or braces that could injure other players.",
      "Teams must wear matching or coordinated jerseys.",
    ]
  },
  {
    title: "Facility Rules",
    items: [
      "Playing surface: ~4,500 sq ft artificial turf inside a warehouse.",
      "Walls and columns are near the field \u2014 play at your own risk.",
      "No food or drinks near the pitch (water only).",
      "No smoking or vaping inside the facility.",
      "FTY LAB is not responsible for lost or stolen belongings.",
    ]
  },
  {
    title: "Entry Fee",
    items: [
      "$200 per team. Non-refundable.",
      "Payment must be received before the tournament to confirm your spot.",
    ]
  },
  {
    title: "Waiver & Liability",
    items: [
      "All participants must sign the liability waiver before playing.",
      "Must be 18+ to sign (or parent/guardian signature required for minors).",
      "Assumption of risk for indoor soccer in a warehouse facility.",
      "FTY LAB reserves the right to remove any participant for unsportsmanlike conduct.",
      "Media release consent: photos and video from the event may be used by FTY LAB.",
      "Concussion protocol: any player suspected of a concussion must sit out.",
    ]
  },
];

// ===== SCHEDULE TAB =====
function ScheduleTab({ tournament, admin, saveTournament }) {
  const gaStandings = computeGroupStandings(tournament.groups[0]);
  const gbStandings = computeGroupStandings(tournament.groups[1]);
  const anyGAPlayed = gaStandings.some(t => t.gp > 0);
  const anyGBPlayed = gbStandings.some(t => t.gp > 0);

  // Auto-advancing bracket
  const sf1Home = anyGAPlayed ? gaStandings[0].team : "A1";
  const sf1Away = anyGBPlayed ? gbStandings[1].team : "B2";
  const sf2Home = anyGBPlayed ? gbStandings[0].team : "B1";
  const sf2Away = anyGAPlayed ? gaStandings[1].team : "A2";
  const fHome = tournament.semis[0].winner || "SF1 Winner";
  const fAway = tournament.semis[1].winner || "SF2 Winner";

  const updateGroupGame = (gi, ggi, val) => {
    const d = JSON.parse(JSON.stringify(tournament));
    d.groups[gi].games[ggi].score = formatScore(val);
    saveTournament(d);
  };

  const updateKnockout = (type, idx, val, home, away) => {
    const d = JSON.parse(JSON.stringify(tournament));
    const match = type === "semi" ? d.semis[idx] : d.final;
    match.score = formatScore(val);
    match.pens = "";
    const parsed = parseScore(val);
    if (parsed) {
      const [hg, ag] = parsed;
      if (hg > ag) match.winner = home;
      else if (ag > hg) match.winner = away;
      else match.winner = "";
    } else {
      match.winner = "";
    }
    saveTournament(d);
  };

  const updatePens = (type, idx, val, home, away) => {
    const d = JSON.parse(JSON.stringify(tournament));
    const match = type === "semi" ? d.semis[idx] : d.final;
    match.pens = val || "";
    const parsed = parseScore(val);
    if (parsed && parsed[0] !== parsed[1]) {
      match.winner = parsed[0] > parsed[1] ? home : away;
    } else {
      match.winner = "";
    }
    saveTournament(d);
  };

  // Build a single chronological list of all group games
  const allGames = [];
  tournament.groups.forEach((group, gi) => {
    group.games.forEach((g, ggi) => {
      allGames.push({ ...g, gi, ggi, group: group.name });
    });
  });
  allGames.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return toMin(a.time) - toMin(b.time);
  });

  return (
    <div>
      {/* Group stage header */}
      <div style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#1A1A1A", display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ background:"#E8B931", width:4, height:16, borderRadius:2 }} />
        Group Stage
      </div>

      {allGames.map((g, i) => {
        const parsed = parseScore(g.score);
        const hg = parsed ? parsed[0] : null;
        const ag = parsed ? parsed[1] : null;
        const homeWon = hg !== null && hg > ag;
        const awayWon = ag !== null && ag > hg;
        const groupTag = g.group === "Group A" ? "A" : "B";
        return (
          <div key={i} style={{ background:"#fff", borderRadius:10, padding:"10px 12px", marginBottom:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", border:"1px solid #e8e5df" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#666" }}>{g.time || ""}</span>
              <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:"#555", background:"#f0f0f0", borderRadius:4, padding:"1px 6px" }}>{groupTag}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:tc(g.home).accent, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight: homeWon?800:500 }}>{g.home}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:tc(g.away).accent, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight: awayWon?800:500 }}>{g.away}</span>
                </div>
              </div>
              <div style={{ textAlign:"center", minWidth:70 }}>
                <ScoreInput score={g.score} onSave={v => updateGroupGame(g.gi, g.ggi, v)} admin={admin} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Semifinals */}
      <div style={{ fontSize:14, fontWeight:700, color:"#1A1A1A", marginTop:8, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        <Swords size={16} color="#E8B931" /> Semifinals
      </div>
      <BracketMatchCard
        label={`SEMI 1 \u2014 A1 vs B2${tournament.semis[0].time ? "  \u2022  " + tournament.semis[0].time : ""}`}
        home={sf1Home} away={sf1Away}
        score={tournament.semis[0].score}
        pens={tournament.semis[0].pens || ""}
        admin={admin}
        winner={tournament.semis[0].winner}
        onScoreChange={v => updateKnockout("semi", 0, v, sf1Home, sf1Away)}
        onPensChange={v => updatePens("semi", 0, v, sf1Home, sf1Away)}
      />
      <BracketMatchCard
        label={`SEMI 2 \u2014 B1 vs A2${tournament.semis[1].time ? "  \u2022  " + tournament.semis[1].time : ""}`}
        home={sf2Home} away={sf2Away}
        score={tournament.semis[1].score}
        pens={tournament.semis[1].pens || ""}
        admin={admin}
        winner={tournament.semis[1].winner}
        onScoreChange={v => updateKnockout("semi", 1, v, sf2Home, sf2Away)}
        onPensChange={v => updatePens("semi", 1, v, sf2Home, sf2Away)}
      />

      {/* Final */}
      <div style={{ fontSize:14, fontWeight:700, color:"#1A1A1A", marginTop:8, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        <Trophy size={16} color="#E8B931" /> Final
      </div>
      <BracketMatchCard
        label={`CHAMPIONSHIP${tournament.final.time ? "  \u2022  " + tournament.final.time : ""}`}
        home={fHome} away={fAway}
        score={tournament.final.score}
        pens={tournament.final.pens || ""}
        admin={admin}
        winner={tournament.final.winner}
        onScoreChange={v => updateKnockout("final", 0, v, fHome, fAway)}
        onPensChange={v => updatePens("final", 0, v, fHome, fAway)}
      />

      {/* Champion banner */}
      {tournament.final.winner && (
        <div style={{ background:"linear-gradient(135deg,#E8B931,#F5CC00)", borderRadius:12, padding:"20px 16px", textAlign:"center", marginTop:12 }}>
          <div><Crown size={40} color="#0D0D0D" /></div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#0D0D0D", fontFamily:"'DM Mono',monospace", marginTop:4 }}>REYES DEL BARRIO CHAMPION</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#0D0D0D", marginTop:6 }}>{tournament.final.winner}</div>
        </div>
      )}

      <div style={{ fontSize:11, color:"#555", marginTop:12, background:"#fff", borderRadius:8, padding:"10px 12px" }}>
        <strong>Tiebreaker order:</strong> Points {"\u2192"} Head-to-head {"\u2192"} Goal difference {"\u2192"} Fewest goals conceded {"\u2192"} Most goals scored {"\u2192"} Coin flip
      </div>
      <div style={{ height:32 }} />
    </div>
  );
}

// ===== STANDINGS TAB =====
function StandingsTab({ tournament }) {
  const renderTable = (group) => {
    const data = computeGroupStandings(group);
    return (
      <div style={{ overflowX:"auto", overflowY:"hidden", WebkitOverflowScrolling:"touch", marginBottom:24 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#0D0D0D", color:"#E8B931" }}>
              {["#","Team","GP","W","D","L","GF","GA","GD","PTS"].map(h => (
                <th key={h} style={{ padding:"8px 4px", textAlign: h==="Team"?"left":"center", fontWeight:600, fontFamily:"'DM Mono',monospace", fontSize:10, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const c = tc(row.team);
              return (
                <tr key={i} style={{ background: i<2 ? (i===0?"#FFFBE6":"#FFF8E1") : i%2===0 ? "#fff" : "#faf9f6", borderLeft:`3px solid ${c.accent}` }}>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{i+1}</td>
                  <td style={{ padding:"8px 4px", fontWeight:600, whiteSpace:"nowrap" }}>
                    <TeamBadge team={row.team} small />
                    {i < 2 && row.gp > 0 && <span style={{ fontSize:8, color:"#E8B931", fontWeight:700, marginLeft:4 }}>ADVANCE</span>}
                  </td>
                  {["gp","w","d","l","gf","ga","gd","pts"].map(f => (
                    <td key={f} style={{ padding:"8px 3px", textAlign:"center", fontFamily:"'DM Mono',monospace", fontWeight: f==="pts"?700:400, color: f==="gd" ? (row[f]>0?"#27AE60":row[f]<0?"#C0392B":"#666") : f==="pts"?"#0D0D0D":"#444" }}>
                      {f==="gd" && row[f]>0 ? `+${row[f]}` : row[f]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ background:"#E8B931", width:4, height:16, borderRadius:2 }} />
        Group A Standings
      </div>
      {renderTable(tournament.groups[0])}
      <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ background:"#E8B931", width:4, height:16, borderRadius:2 }} />
        Group B Standings
      </div>
      {renderTable(tournament.groups[1])}
      <div style={{ fontSize:11, color:"#555", background:"#fff", borderRadius:8, padding:"10px 12px" }}>
        <strong>Top 2 from each group advance to the semifinals.</strong>
      </div>
    </div>
  );
}

// ===== INFO TAB =====
function InfoTab() {
  const [openRule, setOpenRule] = useState(null);
  return (
    <div>
      <div style={{ fontSize:16, fontWeight:800, color:"#1A1A1A", marginBottom:12 }}>Tournament Info</div>
      {RULES.map((section, i) => (
        <div key={i} style={{ marginBottom:6 }}>
          <button onClick={() => setOpenRule(openRule===i?null:i)} aria-expanded={openRule===i} style={{ width:"100%", background:"#fff", border:"1px solid #e0ddd6", borderRadius:8, padding:"14px 14px", minHeight:44, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:600, fontSize:13, touchAction:"manipulation" }}>
            {section.title}
            <span style={{ fontSize:16, color:"#999", transform: openRule===i?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>{"\u25BE"}</span>
          </button>
          {openRule===i && (
            <div style={{ background:"#fff", borderRadius:"0 0 8px 8px", padding:"8px 14px", borderTop:"none" }}>
              {section.items.map((item, j) => (
                <div key={j} style={{ fontSize:13, color:"#444", padding:"4px 0", lineHeight:1.5, borderBottom: j<section.items.length-1?"1px solid #f0ede8":"none" }}>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Contact Section */}
      <div style={{ fontSize:16, fontWeight:800, color:"#1A1A1A", marginTop:24, marginBottom:12 }}>Contact</div>
      <div style={{ background:"#fff", borderRadius:8, padding:"12px 14px", marginBottom:6, borderLeft:"3px solid #E8B931" }}>
        <div style={{ fontWeight:700, fontSize:14 }}>FTY LAB</div>
        <div style={{ fontSize:12, color:"#666", marginTop:4 }}>121A Hall Rd, Watsonville, CA 95076</div>
        <div style={{ fontSize:12, color:"#1565C0", marginTop:4, fontFamily:"'DM Mono',monospace" }}>ftylab831@gmail.com</div>
        <div style={{ fontSize:12, color:"#666", marginTop:2, fontFamily:"'DM Mono',monospace" }}>(831) 359-1586</div>
      </div>

      {/* CTA */}
      <div style={{ background:"linear-gradient(135deg,#1A1A1A,#0D0D0D)", borderRadius:12, padding:20, marginTop:24, textAlign:"center", color:"#fff" }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>Want to play?</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:12 }}>Reach out to register your team for the next tournament.</div>
        <a href="mailto:ftylab831@gmail.com" style={{ display:"inline-block", background:"#E8B931", color:"#0D0D0D", padding:"10px 24px", borderRadius:8, fontWeight:700, fontSize:14, textDecoration:"none" }}>
          Contact Us
        </a>
      </div>
      <div style={{ height:20 }} />
    </div>
  );
}

// ===== MAIN APP =====
export default function ReyesDelBarrio() {
  const [tab, setTab] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tournament, setTournament] = useState(DEFAULT_TOURNAMENT);
  const [announcement, setAnnouncement] = useState("");
  const [annDraft, setAnnDraft] = useState("");
  const [annPosted, setAnnPosted] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    (async () => {
      const [t, a] = await Promise.all([
        loadStorage("rdb-tournament", DEFAULT_TOURNAMENT),
        loadStorage("rdb-announcement", ""),
      ]);
      setTournament(t);
      setAnnouncement(a || "");
      setAnnDraft(a || "");
      setLoaded(true);

      // Admin route
      const path = window.location.pathname;
      if (path === "/admin" || path === "/login") {
        const pw = prompt("Enter admin password:");
        if (pw !== null) {
          if (await checkPassword(pw)) setAdmin(true);
          else alert("Incorrect password");
        }
        window.history.replaceState({}, "", "/");
      }
    })();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("rdb_data_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "league_data" }, handleRealtimeChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "league_data" }, handleRealtimeChange)
      .subscribe();
    return () => supabase.removeChannel(channel);

    function handleRealtimeChange(payload) {
      try {
        if (!payload?.new?.key) return;
        const { key } = payload.new;
        let value = payload.new.value;
        if (value === null || value === undefined) return;
        if (_localWrites.has(key)) return;
        if (typeof value === "string") {
          try { value = JSON.parse(value); } catch { return; }
        }
        localStorage.setItem(key, JSON.stringify(value));
        if (key === "rdb-tournament") setTournament(value);
        else if (key === "rdb-announcement") { setAnnouncement(value); setAnnDraft(value || ""); }
      } catch(e) { console.error("Realtime error:", e); }
    }
  }, []);

  // Save helpers
  const saveTournament = useCallback((d) => { setTournament(d); saveStorage("rdb-tournament", d); }, []);
  const saveAnnouncement = useCallback((text) => { setAnnouncement(text); saveStorage("rdb-announcement", text); }, []);

  const handleAdminToggle = async () => {
    if (admin) { setAdmin(false); return; }
    const pw = prompt("Enter admin password:");
    if (pw !== null) {
      if (await checkPassword(pw)) setAdmin(true);
      else alert("Incorrect password");
    }
  };

  const handlePostAnnouncement = () => {
    saveAnnouncement(annDraft.trim());
    setAnnPosted(true);
    setTimeout(() => setAnnPosted(false), 2500);
  };

  const handleClearAnnouncement = () => {
    saveAnnouncement("");
    setAnnDraft("");
    setAnnPosted(false);
  };

  const tabs = [
    { icon: CalendarDays, label: "Schedule" },
    { icon: Trophy, label: "Standings" },
    { icon: Info, label: "Info" },
  ];

  if (!loaded) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100dvh", fontFamily:"'Bricolage Grotesque',sans-serif", background:"#0D0D0D", color:"#E8B931" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", background:"#F4F1EC", minHeight:"100dvh", maxWidth:480, margin:"0 auto", position:"relative", paddingBottom:"calc(72px + env(safe-area-inset-bottom, 8px))" }}>
      {/* Admin banner */}
      {admin && (
        <div style={{ background:"#27AE60", color:"#fff", padding:"6px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13, fontWeight:600, gap:8, flexWrap:"wrap" }}>
          <span style={{display:'flex',alignItems:'center',gap:6}}><Unlock size={14} /> Admin Mode</span>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={() => {
              const backup = { tournament, announcement, exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type:"application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `rdb-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
            }} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:12 }}>Export</button>
            <label style={{ background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:12 }}>
              Import
              <input type="file" accept=".json" style={{display:"none"}} onChange={e => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const d = JSON.parse(ev.target.result);
                    if (d.tournament) { setTournament(d.tournament); saveStorage("rdb-tournament", d.tournament); }
                    if (d.announcement !== undefined) { setAnnouncement(d.announcement); setAnnDraft(d.announcement || ""); saveStorage("rdb-announcement", d.announcement); }
                    alert("Data restored successfully.");
                  } catch { alert("Invalid backup file."); }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
            <button onClick={() => {
              if (confirm("Reset ALL scores and bracket data? This cannot be undone.")) {
                saveTournament(JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT)));
              }
            }} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:12 }}>Reset</button>
            <button onClick={() => setAdmin(false)} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:12 }}>Lock</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg, #0D0D0D, #1A1A1A)", padding:"20px 16px 16px", color:"#fff", display:"flex", alignItems:"center", gap:14 }}>
        <img src="/rdb-logo.png" alt="Reyes Del Barrio" style={{ width:64, height:64, borderRadius:10, objectFit:"cover", flexShrink:0, background:"#111" }} onError={e => { e.target.style.display = "none"; }} />
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>Reyes Del Barrio</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2, fontFamily:"'DM Mono',monospace" }}>3v3 Indoor Soccer Tournament</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'DM Mono',monospace", marginTop:1 }}>FTY LAB {"\u2022"} Watsonville, CA {"\u2022"} <span style={{ color:"#E8B931" }}>2026</span></div>
        </div>
      </div>

      {/* Announcement banner (viewer) */}
      {!admin && announcement && (
        <div style={{ background:"#FFF8E1", borderLeft:"4px solid #E8B931", padding:"10px 14px", margin:"12px 12px 0", borderRadius:6 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#B8860B", fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:2 }}>ANNOUNCEMENT</div>
          <div style={{ fontSize:13, color:"#444", lineHeight:1.5 }}>{announcement}</div>
        </div>
      )}

      {/* Announcement editor (admin) */}
      {admin && (
        <div style={{ margin:"12px 12px 0", border:"2px dashed #E8B931", borderRadius:8, padding:"10px 12px", background:"#FFFDF0" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#B8860B", fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:6 }}>ANNOUNCEMENT EDITOR</div>
          <textarea
            value={annDraft}
            onChange={e => setAnnDraft(e.target.value)}
            placeholder="Type an announcement..."
            style={{ width:"100%", minHeight:50, border:"1px solid #e0ddd6", borderRadius:6, padding:8, fontSize:16, fontFamily:"'Bricolage Grotesque',sans-serif", resize:"vertical", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            <button onClick={handlePostAnnouncement} style={{ background:"#27AE60", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {annPosted ? "Posted!" : "Post"}
            </button>
            {announcement && (
              <button onClick={handleClearAnnouncement} style={{ background:"#C0392B", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600 }}>Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding:"12px 12px 0" }}>
        {tab === 0 && <ScheduleTab tournament={tournament} admin={admin} saveTournament={saveTournament} />}
        {tab === 1 && <StandingsTab tournament={tournament} />}
        {tab === 2 && <InfoTab />}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"#0D0D0D", display:"flex", justifyContent:"space-around", padding:"6px 0 env(safe-area-inset-bottom, 8px)", zIndex:100, borderTop:"1px solid #1A1A1A" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} aria-label={t.label} style={{ background:"none", border:"none", color: tab===i ? "#E8B931" : "rgba(255,255,255,0.4)", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", padding:"8px 16px", fontSize:10, fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight: tab===i?700:400, minHeight:44, touchAction:"manipulation" }}>
            <t.icon size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
