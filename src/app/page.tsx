"use client";

import { useEffect, useState } from "react";
import Scene3D from "../components/Scene3D";

const SUPABASE_URL = `${process.env.AWOS_SUPABASE_URL}/rest/v1/awos_data?select=*&order=id.desc&limit=1&apikey=${process.env.AWOS_SUPABASE_ANON_KEY}`;
const LOGGER_URL = `${process.env.ASRS_LOGGER_SUPABASE_URL}/rest/v1/logger_data?select=*&order=received_at.desc&limit=1&apikey=${process.env.ASRS_LOGGER_SUPABASE_ANON_KEY}`;

export default function Home() {
  const [droneMode, setDroneMode] = useState(false);
  const [awosData, setAwosData] = useState<any>({
    site04: {},
    mid: {},
    site22: {},
    lastUpdate: "Menghubungkan ke database AWOS...",
    hour: 12,
  });

  const [sunshineDur, setSunshineDur] = useState<number | string>("-");
  const fetchLoggerData = async () => {
    try {
      const res = await fetch(LOGGER_URL);
      const data = await res.json();
      if (data && data.length > 0) {
        setSunshineDur(data[0].sunshine_dur);
      }
    } catch (error) {
      console.error("Gagal mengambil data logger:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLoggerData();
    const interval = setInterval(() => {
      fetchData();
      fetchLoggerData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const [resetCamera, setResetCamera] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(SUPABASE_URL);
      const data = await res.json();

      if (data && data.length > 0) {
        const latest = data[0];
        const dateObj = new Date(latest.received_at);

        setAwosData({
          site04: {
            wd: latest.site04_wd ?? "-",
            ws: latest.site04_ws ?? "-",
            wgd: latest.site04_wgd ?? "-",
            wgs: latest.site04_wgs ?? "-",
            temp: latest.site04_temp ?? "-",
            dewp: latest.site04_dewp ?? "-",
            rh: latest.site04_rh ?? "-",
            qnh: latest.site04_qnh ?? "-",
            da: latest.site04_da ?? "-",
            rain: latest.site04_rain ?? "-",
            vis: latest.site04_vis ?? "-",
            rvr: latest.site04_rvr ?? "-",
            sky: latest.site04_sky || "-",
            pw: latest.site04_pw || "-",
            ltx: latest.site04_ltx || "",
          },
          mid: {
            wd: latest.middle_wd ?? "-",
            ws: latest.middle_ws ?? "-",
            wgd: latest.middle_wgd ?? "-",
            wgs: latest.middle_wgs ?? "-",
            temp: latest.middle_temp ?? "-",
            dewp: latest.middle_dewp ?? "-",
            rh: latest.middle_rh ?? "-",
            qnh: latest.middle_qnh ?? "-",
            da: latest.middle_da ?? "-",
            rain: latest.middle_rain ?? "-",
            sol: latest.middle_sol ?? "-",
            ltx: latest.middle_ltx || "",
          },
          site22: {
            wd: latest.site22_wd ?? "-",
            ws: latest.site22_ws ?? "-",
            wgd: latest.site22_wgd ?? "-",
            wgs: latest.site22_wgs ?? "-",
            temp: latest.site22_temp ?? "-",
            dewp: latest.site22_dewp ?? "-",
            rh: latest.site22_rh ?? "-",
            qnh: latest.site22_qnh ?? "-",
            da: latest.site22_da ?? "-",
            rain: latest.site22_rain ?? "-",
            vis: latest.site22_vis ?? "-",
            rvr: latest.site22_rvr ?? "-",
            sky: latest.site22_sky || "-",
            pw: latest.site22_pw || "-",
            ltx: latest.site22_ltx || "",
          },
          lastUpdate: dateObj.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          hour: dateObj.getHours(),
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const DataItem = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex flex-col">
      <span className="text-[9px] text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );

  const combinedLtx =
    awosData.mid?.ltx || awosData.site04?.ltx || awosData.site22?.ltx || "";
  const hasLightning = combinedLtx.includes("LTG");

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene3D
        awosData={awosData}
        resetCameraTrigger={resetCamera}
        hour={awosData.hour}
        droneMode={droneMode}
      />

      {/* UI OVERLAY */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
        {/* TOP BAR */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex gap-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-xl text-white">
              <h1 className="text-2xl font-bold tracking-widest text-green-400">
                AWOS DASHBOARD
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-300 font-mono mt-1">
                <p>UPDATE: {awosData.lastUpdate} WITA</p>

                {/* Indikator LIVE Modern (Biru) */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <div className="relative flex h-2 w-2">
                    {/* Efek radar/ping yang berkedip */}
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    {/* Titik inti yang solid */}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-500 tracking-widest">
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            <div
              id="compass-hud"
              className="bg-black/80 backdrop-blur-md border border-white/20 text-[#00ffcc] px-4 py-2 rounded-xl font-mono text-lg font-bold shadow-lg min-w-32.5 flex justify-center items-center"
            >
              Arah: 0°
            </div>

            {/* LEGENDA ANGIN */}
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center gap-3">
              <p className="text-[10px] text-gray-300">WIND (kt)</p>
              <div className="flex text-[10px] font-bold">
                <div className="bg-[#74b9ff] px-2 py-1 text-black rounded-l-md">
                  &lt;5
                </div>
                <div className="bg-[#55efc4] px-2 py-1 text-black">5-10</div>
                <div className="bg-[#ffeaa7] px-2 py-1 text-black">10-15</div>
                <div className="bg-[#fab1a0] px-2 py-1 text-black">15-20</div>
                <div className="bg-[#ff7675] px-2 py-1 text-white rounded-r-md">
                  &gt;20
                </div>
              </div>
            </div>

            {/* SUNSHINE DURATION*/}
            <div className="-ml-2 bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center gap-3">
              <p className="text-[12px] text-gray-300 uppercase">
                Sunshine Duration
              </p>
              <span className="font-mono text-sm font-bold text-yellow-400">
                {sunshineDur}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="px-4 py-2 bg-gray-900/80 backdrop-blur-md border border-gray-600 rounded-xl text-white font-bold text-xs hover:bg-gray-700 transition"
            >
              {isMinimized ? "SHOW PANELS" : "MINIMIZE"}
            </button>
            <button
              onClick={() => setResetCamera((prev) => prev + 1)}
              className="w-12 h-12 bg-gray-900/80 border border-gray-500 rounded-full text-red-500 font-black hover:scale-105 shadow-lg"
            >
              N
            </button>
            <button
              onClick={() => setDroneMode(!droneMode)}
              className={`px-4 py-2 border rounded-xl font-bold text-xs transition ${
                droneMode
                  ? "bg-red-600 text-white border-red-500 hover:bg-red-700"
                  : "bg-blue-600/80 text-white border-blue-500 hover:bg-blue-700"
              }`}
            >
              {droneMode ? "EXIT DRONE" : "DRONE MODE"}
            </button>
          </div>
        </div>

        {/* LIGHTNING WARNING BANNER */}
        {hasLightning && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-md border border-red-400 text-white px-5 py-1.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.6)] font-bold flex items-center gap-1 pointer-events-auto">
            <span className="text-lg">⚡</span>
            <span className="tracking-widest text-sm">
              WARNING: {combinedLtx}
            </span>
          </div>
        )}

        {/* BOTTOM PANELS */}
        <div
          className={`grid grid-cols-3 gap-4 pointer-events-auto pb-2 transition-transform duration-500 ${isMinimized ? "translate-y-96" : "translate-y-0"}`}
        >
          <div className="bg-black/80 backdrop-blur-md border-t-4 border-blue-500 p-4 rounded-xl text-white shadow-2xl">
            <h2 className="text-lg font-bold text-blue-400 border-b border-white/20 pb-1 mb-2">
              RWY 04
            </h2>
            <div className="grid grid-cols-3 gap-y-3 gap-x-2">
              <DataItem
                label="WIND"
                value={`${awosData.site04.wd}° / ${awosData.site04.ws}kt`}
              />
              <DataItem
                label="GUST"
                value={`${awosData.site04.wgd}° / ${awosData.site04.wgs}kt`}
              />
              <DataItem
                label="VIS / RVR"
                value={`${awosData.site04.vis} / ${awosData.site04.rvr}`}
              />
              <DataItem
                label="TEMP / DEWP"
                value={`${awosData.site04.temp}°C / ${awosData.site04.dewp}°C`}
              />
              <DataItem label="RH" value={`${awosData.site04.rh}%`} />
              <DataItem label="RAIN" value={`${awosData.site04.rain} mm`} />
              <DataItem label="QNH" value={`${awosData.site04.qnh} hPa`} />
              <DataItem label="D. ALT" value={`${awosData.site04.da} ft`} />
              <DataItem label="PW" value={awosData.site04.pw} />
              <div className="col-span-3">
                <DataItem label="SKY COND" value={awosData.site04.sky} />
              </div>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md border-t-4 border-yellow-500 p-4 rounded-xl text-white shadow-2xl scale-[0.97]">
            <h2 className="text-lg font-bold text-yellow-400 border-b border-white/20 pb-1 mb-2">
              MIDDLE
            </h2>
            <div className="grid grid-cols-3 gap-y-3 gap-x-2">
              <DataItem
                label="WIND"
                value={`${awosData.mid.wd}° / ${awosData.mid.ws}kt`}
              />
              <DataItem
                label="GUST"
                value={`${awosData.mid.wgd}° / ${awosData.mid.wgs}kt`}
              />
              <DataItem label="SOLAR" value={`${awosData.mid.sol}`} />
              <DataItem
                label="TEMP / DEWP"
                value={`${awosData.mid.temp}°C / ${awosData.mid.dewp}°C`}
              />
              <DataItem label="RH" value={`${awosData.mid.rh}%`} />
              <DataItem label="RAIN" value={`${awosData.mid.rain} mm`} />
              <DataItem label="QNH" value={`${awosData.mid.qnh} hPa`} />
              <DataItem label="D. ALT" value={`${awosData.mid.da} ft`} />
              <div className="col-span-3">
                <DataItem label="LIGHTNING" value={awosData.mid.ltx} />
              </div>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md border-t-4 border-purple-500 p-4 rounded-xl text-white shadow-2xl">
            <h2 className="text-lg font-bold text-purple-400 border-b border-white/20 pb-1 mb-2">
              RWY 22
            </h2>
            <div className="grid grid-cols-3 gap-y-3 gap-x-2">
              <DataItem
                label="WIND"
                value={`${awosData.site22.wd}° / ${awosData.site22.ws}kt`}
              />
              <DataItem
                label="GUST"
                value={`${awosData.site22.wgd}° / ${awosData.site22.wgs}kt`}
              />
              <DataItem
                label="VIS / RVR"
                value={`${awosData.site22.vis} / ${awosData.site22.rvr}`}
              />
              <DataItem
                label="TEMP / DEWP"
                value={`${awosData.site22.temp}°C / ${awosData.site22.dewp}°C`}
              />
              <DataItem label="RH" value={`${awosData.site22.rh}%`} />
              <DataItem label="RAIN" value={`${awosData.site22.rain} mm`} />
              <DataItem label="QNH" value={`${awosData.site22.qnh} hPa`} />
              <DataItem label="D. ALT" value={`${awosData.site22.da} ft`} />
              <DataItem label="PW" value={awosData.site22.pw} />
              <div className="col-span-3">
                <DataItem label="SKY COND" value={awosData.site22.sky} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
