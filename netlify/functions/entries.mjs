import { getStore } from "@netlify/blobs";

const KEY = "entries";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function loadEntries() {
  const store = getStore("travel-diary");

  try {
    const entries = await store.get(KEY, { type: "json" });
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

export default async (request) => {
  try {
    const store = getStore("travel-diary");

    // 저장된 여행기록 불러오기
    if (request.method === "GET") {
      const entries = await loadEntries();

      return json({
        ok: true,
        entries
      });
    }

    // 새 여행기록 추가하기
    if (request.method === "POST") {
      const correctPin = process.env.DIARY_PIN;

      if (!correctPin) {
        return json(
          { ok: false, error: "DIARY_PIN이 설정되지 않았습니다." },
          500
        );
      }

      const suppliedPin =
        request.headers.get("x-diary-pin") || "";

      if (suppliedPin !== correctPin) {
        return json(
          { ok: false, error: "비밀번호가 올바르지 않습니다." },
          401
        );
      }

      const body = await request.json();

      const destination =
        String(body.destination || "").trim();

      const date =
        String(body.date || "").trim();

      const memo =
        String(body.memo || "").trim();

      const images =
        Array.isArray(body.images) ? body.images : [];

      if (!destination || !date) {
        return json(
          {
            ok: false,
            error: "여행지와 날짜를 입력해주세요."
          },
          400
        );
      }

      // 기존 여행기록을 먼저 불러옵니다.
      const entries = await loadEntries();

      const newEntry = {
        id: crypto.randomUUID(),
        destination,
        date,
        memo,
        images,
        createdAt: new Date().toISOString()
      };

      // 중요:
      // 기존 기록을 삭제하지 않고
      // 새 기록을 맨 앞에 추가합니다.
      entries.unshift(newEntry);

      await store.setJSON(KEY, entries);

      return json({
        ok: true,
        entry: newEntry,
        entries
      });
    }

    return json(
      {
        ok: false,
        error: "지원하지 않는 요청입니다."
      },
      405
    );
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "여행기록 처리 중 오류가 발생했습니다."
      },
      500
    );
  }
};
