// 統一的模型呼叫層，雙後端：
// - 有 ANTHROPIC_API_KEY → Anthropic SDK（原行為，GitHub Actions / 任何有 key 的環境）
// - 設 USE_CLAUDE_CLI=1 → 改走本機 claude CLI（吃 Claude 訂閱，在伺服器容器裡跑，零 API 費用）
import { spawn } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';

const useCli = process.env.USE_CLAUDE_CLI === '1';
const client = useCli ? null : new Anthropic(); // 讀 ANTHROPIC_API_KEY

function askCli(model: string, system: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--append-system-prompt', system];
    const c = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { c.kill('SIGKILL'); reject(new Error('claude CLI 逾時(300s)')); }, 300_000);
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (err += d));
    c.on('error', (e) => { clearTimeout(timer); reject(e); });
    c.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude CLI exit ${code}: ${(err || out).slice(0, 300)}`));
      if (!out.trim()) return reject(new Error('claude CLI 回空內容'));
      resolve(out);
    });
    c.stdin.write(prompt);
    c.stdin.end();
  });
}

export async function ask(model: string, system: string, prompt: string, maxTokens = 4000): Promise<string> {
  if (useCli) return askCli(model, system, prompt);

  const msg = await client!.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  if (!text.trim()) {
    // 偶爾 API 會回空內容（stop_reason 常是 max_tokens 或 refusal），往上抛讓呼叫端重試
    throw new Error(`模型回空內容（model=${model} stop_reason=${msg.stop_reason}）`);
  }
  return text;
}
