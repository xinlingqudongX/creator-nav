import type { APIRoute } from 'astro';
import { getAllPeople } from '../../lib/dating';

// 月老连线人物池（PRD §18）。只读公开数据；红线记录不经由服务端（PRD §17）。
export const GET: APIRoute = async () => {
  const people = await getAllPeople();
  return new Response(JSON.stringify({ people }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
