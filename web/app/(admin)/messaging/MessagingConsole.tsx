'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useCrud';
import { Badge, Card, SectionHeader, Select, Spinner, toneForValue } from '@/components/ui';

type Log = {
  id: string;
  channel: string;
  to: string;
  subject?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
};

type Template = {
  id: string;
  name: string;
  subject: string;
  variables: string[];
};

export default function MessagingConsole({
  channel,
}: {
  channel: 'EMAIL' | 'WHATSAPP';
}) {
  // Paste EVERYTHING that is currently inside your
  // function MessagingConsole(...) here.
}
