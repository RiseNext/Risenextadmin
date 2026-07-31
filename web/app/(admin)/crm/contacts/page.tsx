'use client';

import { ResourcePage } from '@/components/ResourcePage';
import { RESOURCES } from '@/lib/resources';

export default function Page() {
  return <ResourcePage resource={RESOURCES.contacts} />;
}
