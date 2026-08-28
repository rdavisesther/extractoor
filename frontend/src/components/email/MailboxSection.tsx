'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Mail, Plug, AlertCircle, CheckCircle2, Server } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface MailboxSectionProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  host: string;
  setHost: (v: string) => void;
  port: string;
  setPort: (v: string) => void;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string;
  connectionProvider: string;
  onTestConnection: () => void;
}

export function MailboxSection({
  email, setEmail,
  password, setPassword,
  host, setHost,
  port, setPort,
  connectionStatus, connectionError, connectionProvider,
  onTestConnection,
}: MailboxSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50">
            <Mail className="h-4 w-4 text-brand-600" />
          </div>
          <CardTitle>Mailbox Connection</CardTitle>
        </div>
        {connectionStatus === 'success' && connectionProvider && (
          <Badge variant="success">{connectionProvider}</Badge>
        )}
      </CardHeader>

      <div className="space-y-3">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="App Password"
          type="password"
          placeholder="Enter your app password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="For Gmail, use an App Password (not your regular password)"
        />

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Server className="h-3 w-3" />
          {showAdvanced ? 'Hide' : 'Show'} server settings
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <Input
              label="IMAP Host (optional)"
              placeholder="Auto-detected"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <Input
              label="Port"
              type="number"
              placeholder="993"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="sm"
            loading={connectionStatus === 'testing'}
            onClick={onTestConnection}
            icon={connectionStatus === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Plug className="h-4 w-4" />}
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>

          {connectionStatus === 'success' && (
            <span className="text-xs text-emerald-600 font-medium animate-fade-in">Connected successfully</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-xs text-red-600 font-medium flex items-center gap-1 animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {connectionError}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
