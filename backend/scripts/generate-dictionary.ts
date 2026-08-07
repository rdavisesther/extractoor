/**
 * Dictionary generator.
 *
 * Builds `data/dictionary.json` containing 20,000+ realistic subdomain
 * prefixes, each tagged with one or more categories.
 *
 * Strategy:
 *   1. Seed single-word prefixes from a curated category word bank.
 *   2. Combine noun-like words with a generic service-suffix pool to create
 *      realistic compound prefixes (e.g. "claims-portal", "tax-api").
 *   3. Deduplicate, merge categories, and persist deterministically.
 *
 * Run: npm run dictionary
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Word bank. Category name -> realistic prefixes. */
const WORD_BANK: Record<string, string[]> = {
  common: [
    'mail', 'www', 'app', 'api', 'blog', 'cdn', 'admin', 'help', 'info',
    'status', 'home', 'portal', 'web', 'news', 'demo', 'dev', 'test', 'docs',
    'shop', 'store', 'login', 'my', 'new', 'beta', 'alpha', 'staging', 'prod',
    'support', 'about', 'contact', 'faq', 'kb', 'wiki', 'terms', 'privacy',
  ],
  business: [
    'business', 'partner', 'partners', 'sales', 'pricing', 'enterprise',
    'dashboard', 'report', 'reports', 'analytics', 'growth', 'revenue', 'crm',
    'erp', 'procurement', 'supply', 'invoice', 'vendor', 'vendors', 'client',
    'contract', 'office', 'hr', 'payroll', 'intranet', 'recruit', 'onboard',
    'b2b', 'b2c', 'meeting', 'meetings', 'calendar', 'team', 'teams',
  ],
  corporate: [
    'corporate', 'board', 'investor', 'investors', 'ir', 'careers', 'about',
    'press', 'media', 'legal', 'compliance', 'governance', 'audit', 'risk',
    'csr', 'esg', 'policy', 'policies', 'treasury', 'strategy', 'ethics',
    'disclosure', 'reporting', 'stakeholder',
  ],
  security: [
    'secure', 'security', 'auth', 'sso', 'mfa', 'otp', 'token', 'vault',
    'secret', 'key', 'keys', 'cert', 'tls', 'ssl', 'waf', 'firewall',
    'bastion', 'honeypot', 'audit', 'identity', 'access', 'role', 'roles',
    'permission', 'encrypt', 'encryption', 'pin', 'credential', 'credentials',
    'threat', 'detection', 'scan', 'scanning', 'compliance',
  ],
  cloud: [
    'cloud', 's3', 'bucket', 'buckets', 'storage', 'compute', 'serverless',
    'lambda', 'function', 'functions', 'container', 'containers', 'cluster',
    'kubernetes', 'k8s', 'registry', 'image', 'images', 'deploy',
    'deployment', 'deployments', 'infrastructure', 'infra', 'autoscale',
    'provision', 'terraform', 'orchestrator', 'workload', 'workloads',
    'virtual', 'vpc', 'zone', 'zones', 'region', 'regions', 'availability',
  ],
  hosting: [
    'hosting', 'webhost', 'webhosting', 'vps', 'dedicated', 'shared',
    'reseller', 'domain', 'registrar', 'nameserver', 'ns1', 'ns2', 'dns',
    'dns1', 'dns2', 'ftp', 'sftp', 'ftpes', 'webmail', 'cpanel', 'plesk',
    'hpanel', 'backup', 'restore', 'uptime', 'ping', 'speed', 'bandwidth',
    'loadbalancer', 'failover', 'redundant',
  ],
  api: [
    'api', 'api1', 'api2', 'api3', 'apis', 'gateway', 'graphql', 'rest',
    'rpc', 'grpc', 'webhook', 'webhooks', 'websocket', 'websockets', 'events',
    'event', 'streams', 'stream', 'integration', 'integrations', 'connector',
    'connectors', 'endpoint', 'endpoints', 'v1', 'v2', 'v3', 'openapi',
    'swagger', 'sdk', 'client', 'clients', 'token', 'rate-limit',
  ],
  finance: [
    'finance', 'fin', 'financial', 'payment', 'payments', 'pay', 'billing',
    'invoice', 'invoices', 'tax', 'taxes', 'accounting', 'ledger', 'treasury',
    'transaction', 'transactions', 'wallet', 'wallets', 'settlement',
    'settlements', 'fund', 'funds', 'deposit', 'deposits', 'withdrawal',
    'remittance', 'fiat', 'paypal', 'gateway', 'merchant', 'reconciler',
    'statement', 'statements', 'credit', 'debit', 'charge', 'charges',
    'refund', 'refunds', 'recurring',
  ],
  insurance: [
    'insurance', 'insure', 'claims', 'claim', 'policy', 'policies', 'renewal',
    'renew', 'quote', 'quotes', 'premium', 'premiums', 'underwriter',
    'underwriting', 'adjuster', 'adjusters', 'coverage', 'broker', 'brokers',
    'agent', 'agents', 'actuarial', 'risk', 'benefits', 'indemnity',
    'beneficiary', 'loss', 'damage', 'liability', 'deductible', 'endorsement',
  ],
  education: [
    'education', 'edu', 'school', 'schools', 'college', 'university',
    'academy', 'campus', 'student', 'students', 'teacher', 'teachers',
    'course', 'courses', 'lms', 'learn', 'learning', 'elearning', 'classroom',
    'grade', 'grades', 'homework', 'library', 'alumni', 'registrar', 'faculty',
    'enroll', 'enrollment', 'scholarship', 'tutoring', 'curriculum', 'exam',
  ],
  medical: [
    'medical', 'health', 'healthcare', 'hospital', 'clinic', 'doctor',
    'doctors', 'patient', 'patients', 'pharmacy', 'lab', 'radiology',
    'cardiology', 'oncology', 'ehr', 'emr', 'telehealth', 'telemedicine',
    'vaccine', 'vaccination', 'nurse', 'nurses', 'urgentcare', 'records',
    'fhir', 'his', 'diagnostics', 'imaging', 'prescription', 'wellness',
  ],
  technology: [
    'tech', 'technology', 'software', 'system', 'systems', 'hardware',
    'device', 'devices', 'iot', 'edge', 'firmware', 'driver', 'drivers',
    'update', 'updates', 'patch', 'patches', 'release', 'releases', 'build',
    'builds', 'binary', 'binaries', 'telemetry', 'instrumentation', 'kernel',
    'runtime', 'compiler', 'debug', 'benchmark', 'benchmarks', 'loadtest',
  ],
  government: [
    'gov', 'government', 'agency', 'agencies', 'public', 'civic', 'services',
    'municipality', 'state', 'federal', 'license', 'licenses', 'permits',
    'registry', 'taxation', 'census', 'elections', 'voting', 'court',
    'courts', 'citizen', 'citizens', 'transparency', 'open-data', 'open',
    'records', 'complaints', 'notices', 'bids', 'grants',
  ],
  email: [
    'email', 'mail', 'imap', 'pop', 'pop3', 'smtp', 'mx', 'mx1', 'mx2',
    'relay', 'spool', 'sender', 'senders', 'autoresponder', 'newsletter',
    'newsletters', 'mailer', 'inbox', 'outbound', 'inbound', 'spam',
    'antispam', 'filter', 'filters', 'mailing', 'postmaster', 'abuse',
    'bounce', 'bounces', 'verify', 'verification', 'dkim', 'spf', 'dmarc',
    'list', 'lists', 'subscribe', 'unsubscribe',
  ],
  marketing: [
    'marketing', 'marketer', 'campaign', 'campaigns', 'ads', 'ad', 'adserver',
    'creative', 'creatives', 'content', 'seo', 'analytics', 'conversion',
    'conversions', 'funnel', 'funnels', 'landing', 'landings', 'pages',
    'page', 'automation', 'push', 'notification', 'notifications', 'sms',
    'broadcast', 'audience', 'engage', 'engagement', 'tracking', 'tracker',
    'a-b', 'experiments',
  ],
  ecommerce: [
    'ecommerce', 'commerce', 'shop', 'shopping', 'store', 'stores', 'cart',
    'checkout', 'orders', 'order', 'catalog', 'inventory', 'product',
    'products', 'price', 'prices', 'promotion', 'promo', 'coupon', 'coupons',
    'discount', 'discounts', 'reviews', 'review', 'rating', 'ratings',
    'fulfilment', 'fulfillment', 'warehouse', 'pickup', 'seller', 'sellers',
    'marketplace', 'returns', 'shipping', 'tracking',
  ],
  streaming: [
    'streaming', 'stream', 'video', 'videos', 'media', 'player', 'playlist',
    'playlists', 'channel', 'channels', 'content', 'delivery', 'encoder',
    'encode', 'transcoder', 'transcode', 'live', 'vod', 'broadcast',
    'subtitle', 'subtitles', 'captions', 'drm', 'quality', 'adaptive',
    'bitrate', 'ingest', 'origin', 'replay', 'clip', 'clips',
  ],
  gaming: [
    'gaming', 'game', 'games', 'play', 'player', 'players', 'match',
    'matches', 'lobby', 'lobbies', 'leaderboard', 'score', 'scores', 'rank',
    'ranks', 'ladder', 'tournament', 'tournaments', 'clan', 'clans', 'guild',
    'guilds', 'server', 'servers', 'esports', 'battle', 'battles', 'arena',
    'stats', 'season', 'seasons', 'achievement', 'achievements', 'mod',
    'mods', 'patch', 'replay',
  ],
  ai: [
    'ai', 'artificial', 'ml', 'model', 'models', 'inference', 'training',
    'dataset', 'datasets', 'prompt', 'prompts', 'llm', 'embedding',
    'embeddings', 'vector', 'vectors', 'rag', 'finetune', 'agent', 'agents',
    'chatbot', 'chat', 'copilot', 'vision', 'speech', 'tts', 'stt', 'openai',
    'gemini', 'claude', 'torch', 'tensorflow', 'generative', 'hallucination',
    'guardrail', 'guardrails', 'fine-tuning',
  ],
  crypto: [
    'crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'blockchain', 'chain',
    'wallet', 'wallets', 'node', 'nodes', 'validator', 'validators',
    'staking', 'mining', 'exchange', 'swaps', 'swap', 'bridge', 'bridges',
    'defi', 'nft', 'nfts', 'tokens', 'token', 'contract', 'contracts', 'gas',
    'faucet', 'explorer', 'ledger', 'oracle', 'oracles', 'liquidity', 'mint',
    'lending', 'protocol', 'protocols', 'staking',
  ],
  random: [
    'horizon', 'prime', 'vertex', 'fusion', 'atlas', 'nova', 'alpha', 'delta',
    'vector', 'summit', 'nebula', 'pixel', 'quartz', 'ember', 'drift', 'echo',
    'orbit', 'pulse', 'ripple', 'solstice', 'zenith', 'cascade', 'inertia',
    'kinetic', 'luminous', 'magnetic', 'obsidian', 'phoenix', 'quantum',
    'radiant', 'sierra', 'tempest', 'umbra', 'vapor', 'whisper', 'blaze',
    'comet', 'dusk', 'frost', 'galaxy', 'glimmer', 'harbor', 'ion', 'jade',
    'lunar', 'meteor', 'nimbus', 'opal', 'pearl', 'raven', 'sage', 'thunder',
    'valley', 'willow', 'zephyr', 'apex', 'beacon', 'canyon', 'falcon',
    'grove', 'ivory', 'juniper', 'koa', 'lynx', 'meadow', 'onyx', 'prairie',
    'sapphire', 'titan', 'uranium', 'vista', 'wildfire', 'xenon', 'yonder',
    'zest', 'aurora', 'boulder', 'cobalt', 'dawn', 'elysium', 'fjord',
    'granite', 'harbinger', 'iris', 'jubilee', 'kelvin', 'lagoon', 'monolith',
    'nightfall', 'onyx', 'prism', 'quasar', 'reef', 'stratus', 'tide',
    'upsilon', 'vigil', 'wavelength', 'xylophone', 'yarrow', 'zigzag',
  ],
};

/**
 * Service-suffix pool used to build compound prefixes.
 * These nouns combine naturally with the words above: "claims-portal",
 * "tax-api", "medical-cloud", "mail-relay".
 */
const SUFFIX_POOL = [
  'api', 'cloud', 'portal', 'gateway', 'core', 'hub', 'center', 'central',
  'online', 'login', 'auth', 'secure', 'status', 'dashboard', 'support',
  'help', 'docs', 'platform', 'system', 'network', 'apps', 'web', 'global',
  'backup', 'edge', 'data', 'mail', 'relay', 'manager', 'admin', 'console',
  'worker', 'queue', 'internal', 'public', 'private', 'mobile', 'tools',
  'beta', 'staging', 'test', 'dev', 'cdn', 'static', 'assets', 'search',
  'sync', 'metrics', 'logs', 'monitor', 'alerts', 'live', 'sandbox',
  'partner', 'integration', 'careers', 'training', 'report', 'billing',
];

interface PrefixEntry {
  value: string;
  categories: string[];
}

const all: Map<string, Set<string>> = new Map();

function add(value: string, categories: string[]): void {
  const clean = value.toLowerCase().trim().replace(/\.+$/, '');
  if (!clean || clean.length > 63) return;
  const existing = all.get(clean);
  if (existing) {
    for (const c of categories) existing.add(c);
  } else {
    all.set(clean, new Set(categories));
  }
}

// 1. Single words.
for (const [category, words] of Object.entries(WORD_BANK)) {
  for (const word of words) add(word, [category]);
}

// 2. Compound prefixes: word-suffix (skip the "random" bank to keep those
//    entries available purely as creative single prefixes).
for (const [category, words] of Object.entries(WORD_BANK)) {
  if (category === 'random') continue;
  for (const word of words) {
    for (const suffix of SUFFIX_POOL) {
      add(`${word}-${suffix}`, [category]);
    }
  }
}

const prefixes: PrefixEntry[] = [...all.entries()].map(([value, categories]) => ({
  value,
  categories: [...categories].sort(),
}));

const output = {
  version: 1,
  generated: new Date().toISOString(),
  total: prefixes.length,
  prefixes,
};

const outPath = join(__dirname, '..', 'data', 'dictionary.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output), 'utf8');

console.log(`Dictionary written: ${outPath}`);
console.log(`Total prefixes: ${prefixes.length}`);
