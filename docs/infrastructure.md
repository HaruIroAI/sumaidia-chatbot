# SUMAIDIA Infrastructure Configuration

## サーバー構成決定（2025-10-22）

### 選定結果

**人事評価システム + 営業育成AIシステム 共通構成**:
- **Frontend Hosting**: Vercel Pro ($20/月)
- **Database**: Neon PostgreSQL (無料枠 512MB)
- **AI API**: OpenAI GPT-4o / Anthropic Claude 3.5 Sonnet (~$30/月)

**月額合計**: ~$50 (約¥7,500)

---

## 1. Vercel Pro Configuration

### 基本情報
- **プラン**: Vercel Pro ($20/月)
- **リージョン**: Tokyo (東京CDN標準)
- **デプロイ**: 自動CI/CD (GitHub連携)
- **URL**: 本番 + プレビュー環境自動生成

### 主な機能
- Next.js最適化（公式推奨）
- SSR/Edge Functions対応
- 自動HTTPS（Let's Encrypt）
- Image Optimization
- Analytics標準搭載

### 環境変数設定

Vercel Dashboardで以下を設定：

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Authentication (NextAuth.js)
NEXTAUTH_URL=https://sumaidia-hr.vercel.app
NEXTAUTH_SECRET=[generate-with-openssl-rand-base64-32]

# AI API (OpenAI)
OPENAI_API_KEY=sk-proj-...
OPENAI_ORG_ID=org-...

# OR AI API (Anthropic Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Session & CSRF (for production)
SESSION_SECRET=[generate-with-openssl-rand-base64-32]
CSRF_DISABLE=false

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=SUMAIDIA人事評価システム
```

### デプロイ手順

1. **GitHub連携**
```bash
# Vercel CLIインストール（初回のみ）
npm install -g vercel

# プロジェクトリンク
cd /Users/kamikoyuuichi/kamiko-independence/projects/SUMAIDIA/hr-evaluation-system
vercel link

# 環境変数設定（Dashboard推奨）
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add OPENAI_API_KEY production
```

2. **自動デプロイ**
```bash
# mainブランチへのpush = 本番デプロイ
git push origin main

# feature/*ブランチへのpush = プレビュー環境自動作成
git push origin feature/new-dashboard
```

3. **手動デプロイ（緊急時）**
```bash
vercel --prod
```

### カスタムドメイン設定

1. Vercel Dashboard > Domains
2. `hr.sumaidia.com` 追加
3. DNS設定（スマイディア様側）:
   ```
   Type: CNAME
   Name: hr
   Value: cname.vercel-dns.com
   ```

---

## 2. Neon PostgreSQL Configuration

### 基本情報
- **プラン**: Free Tier (512MB storage, 0.5 CPU)
- **リージョン**: Tokyo (aws-ap-northeast-1)
- **接続**: Serverless Driver経由（@neondatabase/serverless）
- **バックアップ**: PITR 7日間（自動）

### データベース設計

**想定データサイズ**:
- 従業員マスター: 50-100人 × ~5KB = 0.25-0.5MB
- 評価データ: 100人 × 4回/年 × 2年 × ~10KB = 8MB
- 監査ログ: ~1年分 = ~10MB
- **合計**: ~20-30MB（無料枠512MBに余裕）

**主要テーブル**:
```sql
-- 従業員マスター
employees (id, name, email, department_id, position_id, role, created_at, updated_at)

-- 評価データ
evaluations (id, employee_id, period, scores, manager_comment, created_at, updated_at)

-- 監査ログ
audit_logs (id, user_id, action, resource, details, ip_address, created_at)

-- セッション管理（NextAuth.js）
sessions, users, accounts, verification_tokens
```

### Prisma Schema設定

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Employee {
  id            String        @id @default(cuid())
  name          String
  email         String        @unique
  departmentId  String
  positionId    String
  role          Role          @default(EMPLOYEE)
  evaluations   Evaluation[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Evaluation {
  id             String   @id @default(cuid())
  employeeId     String
  employee       Employee @relation(fields: [employeeId], references: [id])
  period         String
  scores         Json
  managerComment String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum Role {
  ADMIN
  MANAGER
  LEADER
  EMPLOYEE
}
```

### 初期セットアップ

```bash
# Prisma CLI初期化
cd hr-evaluation-system
npm install prisma @prisma/client @neondatabase/serverless

# マイグレーション実行
npx prisma migrate dev --name init

# Neonダッシュボードで確認
# https://console.neon.tech/app/projects/[project-id]
```

### データインポート

スマイディア様の既存Excel → PostgreSQL:

```typescript
// scripts/import-excel.ts
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importEmployees(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  const employees = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    employees.push({
      name: row.getCell(1).value as string,
      email: row.getCell(2).value as string,
      departmentId: row.getCell(3).value as string,
      positionId: row.getCell(4).value as string,
      role: 'EMPLOYEE',
    });
  });

  await prisma.employee.createMany({ data: employees });
  console.log(`Imported ${employees.length} employees`);
}

importEmployees('/path/to/スマイディア様提供データ/従業員名簿.xlsx');
```

---

## 3. AI API Configuration

### OpenAI GPT-4o（推奨）

**利用ケース**:
- 評価コメント生成
- 部門比較分析
- 営業育成AIチャット

**コスト試算**:
- 入力: ~500 tokens/request
- 出力: ~300 tokens/request
- 単価: $2.50/1M input tokens, $10/1M output tokens
- 月間: 800 requests/user/月 × 10 users = 8,000 requests
- **月額**: ~$30

**実装例** (`app/api/ai/generate-comment/route.ts`):
```typescript
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { scores, employeeName, period } = await request.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたは人事評価の専門家です。評価データから建設的なコメントを生成してください。'
      },
      {
        role: 'user',
        content: `従業員: ${employeeName}\n期間: ${period}\nスコア: ${JSON.stringify(scores)}\n\n評価コメントを生成してください。`
      }
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return NextResponse.json({
    comment: completion.choices[0].message.content
  });
}
```

### Anthropic Claude 3.5 Sonnet（代替案）

**利用ケース**: 同上

**コスト試算**:
- 入力: $3/1M tokens
- 出力: $15/1M tokens
- **月額**: ~$35（OpenAIより若干高い）

**実装例**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 300,
  messages: [
    {
      role: 'user',
      content: `従業員: ${employeeName}\n評価コメントを生成してください。`
    }
  ],
});
```

### ストリーミング応答（営業育成AIチャット）

```typescript
// app/api/ai/chat/route.ts
export async function POST(request: Request) {
  const { messages } = await request.json();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    }),
    {
      headers: { 'Content-Type': 'text/event-stream' },
    }
  );
}
```

---

## 4. Security Configuration

### 認証: NextAuth.js (Auth.js v5)

**設定ファイル** (`app/api/auth/[...nextauth]/route.ts`):
```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 認可: 4段階RBAC

**Middleware** (`middleware.ts`):
```typescript
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ADMIN only
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // MANAGER or above
    if (path.startsWith('/manager') && !['ADMIN', 'MANAGER'].includes(token?.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/manager/:path*', '/dashboard/:path*'],
};
```

### セキュリティヘッダー

**Next.js設定** (`next.config.js`):
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
```

### データベース暗号化

- **Transport Layer**: SSL/TLS強制（Neon標準）
- **At Rest**: AES-256暗号化（Neon標準）
- **接続文字列**: `?sslmode=require`必須

### 監査ログ

**実装例** (`lib/audit.ts`):
```typescript
import { prisma } from '@/lib/prisma';

export async function createAuditLog({
  userId,
  action,
  resource,
  details,
  ipAddress,
}: {
  userId: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
    },
  });
}
```

**使用例**:
```typescript
// app/api/employees/[id]/route.ts
import { createAuditLog } from '@/lib/audit';
import { getServerSession } from 'next-auth';

export async function PATCH(request: Request, { params }) {
  const session = await getServerSession(authOptions);
  const body = await request.json();

  // Update employee
  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: body,
  });

  // Audit log
  await createAuditLog({
    userId: session.user.id,
    action: 'UPDATE',
    resource: `employee:${params.id}`,
    details: body,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
  });

  return NextResponse.json(employee);
}
```

---

## 5. Backup & Disaster Recovery

### 自動バックアップ（Neon）

- **PITR (Point-in-Time Recovery)**: 7日間
- **自動スナップショット**: 日次
- **リテンション**: 7日間（Free Tier）

### 手動バックアップ（Excel Export）

**月次エクスポート** (`scripts/export-to-excel.ts`):
```typescript
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

async function exportMonthlyBackup() {
  const employees = await prisma.employee.findMany({
    include: { evaluations: true },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Employees');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 20 },
    { header: '氏名', key: 'name', width: 20 },
    { header: 'メール', key: 'email', width: 30 },
    { header: '部署', key: 'department', width: 15 },
  ];

  employees.forEach(emp => {
    worksheet.addRow({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      department: emp.departmentId,
    });
  });

  const date = new Date().toISOString().split('T')[0];
  await workbook.xlsx.writeFile(`/backups/employees_${date}.xlsx`);

  console.log(`Backup created: employees_${date}.xlsx`);
}
```

### リカバリ手順

1. **PITR復元**（7日以内）:
   - Neon Dashboard > Restore
   - タイムスタンプ指定
   - 新ブランチ作成

2. **Excelバックアップから復元**:
   ```bash
   npm run import:excel -- /backups/employees_2025-10-01.xlsx
   ```

---

## 6. Monitoring & Performance

### Vercel Analytics（標準搭載）

- **Real User Monitoring (RUM)**
- **Core Web Vitals**
- **Serverless Function Logs**

### カスタムメトリクス

**New Relic / Datadog連携**（オプション）:
```typescript
// lib/monitoring.ts
import { trace } from '@opentelemetry/api';

export function trackPerformance(name: string, fn: () => Promise<any>) {
  const tracer = trace.getTracer('sumaidia-hr');

  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: 0 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### アラート設定

Vercel Dashboard > Integrations > Slack:
- Deployment失敗通知
- Function timeout (10s超過)
- Error rate (5%超過)

---

## 7. Cost Summary

### 月額料金（初期構成）

| サービス | プラン | 月額 | 備考 |
|---------|--------|------|------|
| **Vercel** | Pro | $20 | Next.js hosting, 東京CDN |
| **Neon** | Free | $0 | PostgreSQL 512MB |
| **OpenAI** | Pay-as-you-go | ~$30 | GPT-4o API (800 req/user/月) |
| **合計** | - | **~$50** | **約¥7,500** |

### スケールアップ時（100社展開時）

| サービス | プラン | 月額 | 備考 |
|---------|--------|------|------|
| **Vercel** | Pro | $20 | 変わらず |
| **Neon** | Launch | $19 | 3GB storage, 1 vCPU |
| **OpenAI** | Pay-as-you-go | ~$200 | 100社 × 800 req/月 |
| **合計** | - | **~$240** | **約¥36,000** |

**1社あたりコスト**: ¥360/月（100社規模）

---

## 8. Deployment Checklist

### 初回デプロイ（2025年11月末想定）

- [ ] Vercel Pro契約（神子アカウント）
- [ ] Neon Free Tier登録（Tokyo region）
- [ ] GitHub連携設定
- [ ] 環境変数設定（Vercel Dashboard）
  - [ ] DATABASE_URL
  - [ ] NEXTAUTH_SECRET
  - [ ] OPENAI_API_KEY
  - [ ] SESSION_SECRET
- [ ] Prismaマイグレーション実行
- [ ] 実データインポート（Excel → PostgreSQL）
- [ ] セキュリティヘッダー確認（next.config.js）
- [ ] NextAuth.js認証動作確認
- [ ] RBAC権限テスト（4段階）
- [ ] 監査ログ動作確認
- [ ] カスタムドメイン設定（hr.sumaidia.com）
- [ ] 石光社長にURL共有 + ログイン情報送付

### 運用開始後

- [ ] 月次Excelバックアップ自動化（cron）
- [ ] Vercel Analytics確認（週次）
- [ ] Neonストレージ使用量確認（月次）
- [ ] OpenAI API利用料確認（月次）

---

## 9. Support & Troubleshooting

### よくある問題

**Q1: DATABASE_URLが無効と表示される**
```bash
# Neon Dashboardでコピーした接続文字列を確認
# ?sslmode=require が含まれているか確認
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Q2: NextAuth.jsでログインできない**
```bash
# NEXTAUTH_SECRET生成
openssl rand -base64 32

# Vercel環境変数で設定
vercel env add NEXTAUTH_SECRET production
```

**Q3: Vercelデプロイがタイムアウトする**
```bash
# next.config.jsで最大実行時間延長
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};
```

### 緊急連絡先

- **Vercel Support**: https://vercel.com/support
- **Neon Support**: https://neon.tech/docs/introduction/support
- **OpenAI Support**: https://help.openai.com/

---

**作成日**: 2025年10月22日
**作成者**: 神子 彩果
**最終更新**: 2025年10月22日
**ステータス**: 確定（商用サーバー選択について.pdf準拠）
