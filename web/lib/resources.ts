import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Sparkles, Layers, FolderKanban, Building2, Users, Images, FileText,
  Search, Megaphone, LineChart, Contact, Briefcase, CalendarCheck, Wallet, Palmtree,
  UserSearch, Inbox, ListTodo, CalendarDays, Bell, Mail, MessageCircle, FileBarChart,
  Settings, ScrollText, ShieldCheck, HardDrive, FolderTree, DatabaseBackup, Building, Palette,
} from 'lucide-react';

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'currency' | 'slug' | 'email' | 'url'
  | 'select' | 'multiselect' | 'boolean' | 'date' | 'datetime' | 'tags' | 'media' | 'json';

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  optionsFrom?: string;   // endpoint returning {data:[{id,...}]}
  optionLabel?: string;
  placeholder?: string;
  help?: string;
  from?: string;          // slug source field
  accept?: string;        // media kinds
  col?: 1 | 2;
  hideInTable?: boolean;
};

export type Resource = {
  key: string;
  label: string;
  singular: string;
  endpoint: string;
  permission: string;
  icon: LucideIcon;
  description?: string;
  columns: { key: string; label: string; type?: 'text' | 'badge' | 'media' | 'date' | 'currency' | 'number' | 'boolean' }[];
  fields: Field[];
  searchable?: boolean;
  reorderable?: boolean;
  defaultSort?: string;
};

const stateField: Field = {
  name: 'state',
  label: 'Publish state',
  type: 'select',
  options: [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Archived', value: 'ARCHIVED' },
  ],
};

const orderField: Field = { name: 'order', label: 'Order', type: 'number', col: 1 };

export const RESOURCES: Record<string, Resource> = {
  heroes: {
    key: 'heroes',
    label: 'Hero sections',
    singular: 'Hero',
    endpoint: '/cms/heroes',
    permission: 'cms',
    icon: Sparkles,
    description: 'Every headline, subline and call to action on the risenext.in homepage.',
    reorderable: true,
    columns: [
      { key: 'headline', label: 'Headline' },
      { key: 'eyebrow', label: 'Eyebrow' },
      { key: 'state', label: 'State', type: 'badge' },
      { key: 'order', label: 'Order', type: 'number' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'text', col: 1 },
      { name: 'headline', label: 'Headline', type: 'text', required: true, col: 2 },
      { name: 'subline', label: 'Subline', type: 'text', col: 2 },
      { name: 'body', label: 'Body copy', type: 'textarea', col: 2 },
      { name: 'ctaLabel', label: 'Primary CTA label', type: 'text', col: 1 },
      { name: 'ctaHref', label: 'Primary CTA link', type: 'text', col: 1 },
      { name: 'altCta', label: 'Secondary CTA label', type: 'text', col: 1 },
      { name: 'altHref', label: 'Secondary CTA link', type: 'text', col: 1 },
      { name: 'mediaId', label: 'Background media', type: 'media', accept: 'IMAGE,VIDEO', col: 2 },
      { name: 'theme', label: 'Theme', type: 'select', col: 1, options: [
        { label: 'Cream', value: 'cream' }, { label: 'Ink', value: 'ink' }, { label: 'Ember', value: 'ember' },
      ] },
      orderField,
      stateField,
    ],
  },

  services: {
    key: 'services',
    label: 'Services',
    singular: 'Service',
    endpoint: '/cms/services',
    permission: 'cms',
    icon: Layers,
    reorderable: true,
    columns: [
      { key: 'title', label: 'Service' },
      { key: 'summary', label: 'Summary' },
      { key: 'priceFrom', label: 'From', type: 'currency' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'summary', label: 'Summary', type: 'textarea', col: 2 },
      { name: 'description', label: 'Description', type: 'richtext', col: 2 },
      { name: 'features', label: 'Features', type: 'tags', col: 2, help: 'Press enter after each feature' },
      { name: 'icon', label: 'Icon name', type: 'text', col: 1 },
      { name: 'priceFrom', label: 'Starting price', type: 'currency', col: 1 },
      { name: 'coverId', label: 'Cover image', type: 'media', accept: 'IMAGE', col: 2 },
      orderField,
      stateField,
    ],
  },

  projects: {
    key: 'projects',
    label: 'Projects',
    singular: 'Project',
    endpoint: '/cms/projects',
    permission: 'cms',
    icon: FolderKanban,
    reorderable: true,
    columns: [
      { key: 'title', label: 'Project' },
      { key: 'client.name', label: 'Client' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'featured', label: 'Featured', type: 'boolean' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'clientId', label: 'Client', type: 'select', optionsFrom: '/cms/clients', optionLabel: 'name', col: 1 },
      { name: 'serviceId', label: 'Service', type: 'select', optionsFrom: '/cms/services', optionLabel: 'title', col: 1 },
      { name: 'summary', label: 'Summary', type: 'textarea', col: 2 },
      { name: 'description', label: 'Case study', type: 'richtext', col: 2 },
      { name: 'results', label: 'Results', type: 'tags', col: 2 },
      { name: 'year', label: 'Year', type: 'number', col: 1 },
      { name: 'featured', label: 'Featured on homepage', type: 'boolean', col: 1 },
      { name: 'coverId', label: 'Cover', type: 'media', accept: 'IMAGE,VIDEO', col: 2 },
      orderField,
      stateField,
    ],
  },

  clients: {
    key: 'clients',
    label: 'Clients',
    singular: 'Client',
    endpoint: '/cms/clients',
    permission: 'cms',
    icon: Building2,
    reorderable: true,
    columns: [
      { key: 'logo.url', label: 'Logo', type: 'media' },
      { key: 'name', label: 'Client' },
      { key: 'industry', label: 'Industry' },
      { key: 'author', label: 'Testimonial by' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'industry', label: 'Industry', type: 'text', col: 1 },
      { name: 'website', label: 'Website', type: 'url', col: 1 },
      { name: 'logoId', label: 'Logo', type: 'media', accept: 'IMAGE,SVG', col: 1 },
      { name: 'testimonial', label: 'Testimonial', type: 'textarea', col: 2 },
      { name: 'author', label: 'Author', type: 'text', col: 1 },
      { name: 'authorRole', label: 'Author role', type: 'text', col: 1 },
      orderField,
      stateField,
    ],
  },

  team: {
    key: 'team',
    label: 'Team',
    singular: 'Team member',
    endpoint: '/cms/team',
    permission: 'cms',
    icon: Users,
    reorderable: true,
    columns: [
      { key: 'photo.url', label: 'Photo', type: 'media' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'role', label: 'Role', type: 'text', required: true, col: 1 },
      { name: 'bio', label: 'Bio', type: 'textarea', col: 2 },
      { name: 'email', label: 'Email', type: 'email', col: 1 },
      { name: 'linkedin', label: 'LinkedIn', type: 'url', col: 1 },
      { name: 'photoId', label: 'Photo', type: 'media', accept: 'IMAGE', col: 2 },
      orderField,
      stateField,
    ],
  },

  gallery: {
    key: 'gallery',
    label: 'Gallery',
    singular: 'Album',
    endpoint: '/cms/gallery',
    permission: 'cms',
    icon: Images,
    reorderable: true,
    columns: [
      { key: 'title', label: 'Album' },
      { key: 'kind', label: 'Kind', type: 'badge' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'caption', label: 'Caption', type: 'textarea', col: 2 },
      { name: 'kind', label: 'Kind', type: 'select', col: 1, options: [
        { label: 'Photos', value: 'photo' }, { label: 'Video', value: 'video' },
        { label: 'Reels', value: 'reel' }, { label: 'Podcast', value: 'podcast' },
      ] },
      orderField,
      stateField,
    ],
  },

  pages: {
    key: 'pages',
    label: 'Pages',
    singular: 'Page',
    endpoint: '/cms/pages',
    permission: 'cms',
    icon: FileText,
    columns: [
      { key: 'title', label: 'Page' },
      { key: 'slug', label: 'Slug' },
      { key: 'state', label: 'State', type: 'badge' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'blocks', label: 'Content blocks', type: 'json', col: 2, help: 'Array of block objects rendered by the website' },
      stateField,
    ],
  },

  seo: {
    key: 'seo',
    label: 'SEO',
    singular: 'SEO entry',
    endpoint: '/seo',
    permission: 'seo',
    icon: Search,
    columns: [
      { key: 'path', label: 'Path' },
      { key: 'title', label: 'Title' },
      { key: 'robots', label: 'Robots', type: 'badge' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { name: 'path', label: 'Path', type: 'text', required: true, col: 1, placeholder: '/services' },
      { name: 'title', label: 'Meta title', type: 'text', required: true, col: 1 },
      { name: 'description', label: 'Meta description', type: 'textarea', col: 2 },
      { name: 'keywords', label: 'Keywords', type: 'tags', col: 2 },
      { name: 'canonical', label: 'Canonical URL', type: 'url', col: 1 },
      { name: 'robots', label: 'Robots', type: 'select', col: 1, options: [
        { label: 'index, follow', value: 'index, follow' },
        { label: 'noindex, follow', value: 'noindex, follow' },
        { label: 'noindex, nofollow', value: 'noindex, nofollow' },
      ] },
      { name: 'ogImageId', label: 'OG image', type: 'media', accept: 'IMAGE', col: 2 },
      { name: 'schemaJson', label: 'JSON-LD schema', type: 'json', col: 2 },
    ],
  },

  posts: {
    key: 'posts',
    label: 'Blog posts',
    singular: 'Post',
    endpoint: '/blog/posts',
    permission: 'blog',
    icon: FileText,
    columns: [
      { key: 'title', label: 'Post' },
      { key: 'category.name', label: 'Category' },
      { key: 'author.name', label: 'Author' },
      { key: 'views', label: 'Views', type: 'number' },
      { key: 'state', label: 'State', type: 'badge' },
      { key: 'publishedAt', label: 'Published', type: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 2 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'categoryId', label: 'Category', type: 'select', optionsFrom: '/blog/categories', optionLabel: 'name', col: 1 },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', col: 2 },
      { name: 'content', label: 'Content', type: 'richtext', col: 2 },
      { name: 'coverId', label: 'Cover', type: 'media', accept: 'IMAGE', col: 2 },
      { name: 'readMinutes', label: 'Read minutes', type: 'number', col: 1 },
      { name: 'publishedAt', label: 'Publish date', type: 'datetime', col: 1 },
      stateField,
    ],
  },

  categories: {
    key: 'categories',
    label: 'Categories',
    singular: 'Category',
    endpoint: '/blog/categories',
    permission: 'blog',
    icon: FolderTree,
    columns: [{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, col: 1 },
    ],
  },

  tags: {
    key: 'tags',
    label: 'Tags',
    singular: 'Tag',
    endpoint: '/blog/tags',
    permission: 'blog',
    icon: FolderTree,
    columns: [{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, col: 1 },
    ],
  },

  leads: {
    key: 'leads',
    label: 'Leads',
    singular: 'Lead',
    endpoint: '/crm/leads',
    permission: 'crm',
    icon: Contact,
    columns: [
      { key: 'name', label: 'Lead' },
      { key: 'company', label: 'Company' },
      { key: 'source', label: 'Source', type: 'badge' },
      { key: 'budget', label: 'Budget', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'createdAt', label: 'Received', type: 'date' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'company', label: 'Company', type: 'text', col: 1 },
      { name: 'email', label: 'Email', type: 'email', col: 1 },
      { name: 'phone', label: 'Phone', type: 'text', col: 1 },
      { name: 'source', label: 'Source', type: 'select', col: 1, options: [
        { label: 'Website', value: 'website' }, { label: 'Meta', value: 'meta' },
        { label: 'Google', value: 'google' }, { label: 'Referral', value: 'referral' },
        { label: 'LinkedIn', value: 'linkedin' },
      ] },
      { name: 'service', label: 'Service interest', type: 'text', col: 1 },
      { name: 'budget', label: 'Budget', type: 'currency', col: 1 },
      { name: 'score', label: 'Score', type: 'number', col: 1 },
      { name: 'status', label: 'Status', type: 'select', col: 1, options: [
        { label: 'New', value: 'NEW' }, { label: 'Contacted', value: 'CONTACTED' },
        { label: 'Qualified', value: 'QUALIFIED' }, { label: 'Proposal', value: 'PROPOSAL' },
        { label: 'Won', value: 'WON' }, { label: 'Lost', value: 'LOST' },
      ] },
      { name: 'message', label: 'Message', type: 'textarea', col: 2 },
    ],
  },

  deals: {
    key: 'deals',
    label: 'Deals',
    singular: 'Deal',
    endpoint: '/crm/deals',
    permission: 'crm',
    icon: Briefcase,
    columns: [
      { key: 'title', label: 'Deal' },
      { key: 'value', label: 'Value', type: 'currency' },
      { key: 'stage', label: 'Stage', type: 'badge' },
      { key: 'closeDate', label: 'Close', type: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 2 },
      { name: 'leadId', label: 'Lead', type: 'select', optionsFrom: '/crm/leads', optionLabel: 'name', col: 1 },
      { name: 'value', label: 'Value', type: 'currency', col: 1 },
      { name: 'stage', label: 'Stage', type: 'select', col: 1, options: [
        { label: 'Discovery', value: 'discovery' }, { label: 'Proposal', value: 'proposal' },
        { label: 'Negotiation', value: 'negotiation' }, { label: 'Won', value: 'won' }, { label: 'Lost', value: 'lost' },
      ] },
      { name: 'closeDate', label: 'Expected close', type: 'date', col: 1 },
    ],
  },

  contacts: {
    key: 'contacts',
    label: 'Contact forms',
    singular: 'Submission',
    endpoint: '/crm/contacts',
    permission: 'crm',
    icon: Inbox,
    columns: [
      { key: 'name', label: 'From' },
      { key: 'email', label: 'Email' },
      { key: 'subject', label: 'Subject' },
      { key: 'page', label: 'Page' },
      { key: 'handled', label: 'Handled', type: 'boolean' },
      { key: 'createdAt', label: 'Received', type: 'date' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'email', label: 'Email', type: 'email', required: true, col: 1 },
      { name: 'phone', label: 'Phone', type: 'text', col: 1 },
      { name: 'subject', label: 'Subject', type: 'text', col: 1 },
      { name: 'message', label: 'Message', type: 'textarea', col: 2 },
      { name: 'handled', label: 'Handled', type: 'boolean', col: 1 },
    ],
  },

  employees: {
    key: 'employees',
    label: 'Employees',
    singular: 'Employee',
    endpoint: '/hrms/employees',
    permission: 'hrms',
    icon: Users,
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'firstName', label: 'First name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'designation', label: 'Designation' },
      { key: 'department.name', label: 'Department' },
      { key: 'ctc', label: 'CTC', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { name: 'code', label: 'Employee code', type: 'text', required: true, col: 1 },
      { name: 'firstName', label: 'First name', type: 'text', required: true, col: 1 },
      { name: 'lastName', label: 'Last name', type: 'text', required: true, col: 1 },
      { name: 'email', label: 'Work email', type: 'email', required: true, col: 1 },
      { name: 'phone', label: 'Phone', type: 'text', col: 1 },
      { name: 'designation', label: 'Designation', type: 'text', required: true, col: 1 },
      { name: 'departmentId', label: 'Department', type: 'select', optionsFrom: '/hrms/departments', optionLabel: 'name', col: 1 },
      { name: 'employment', label: 'Employment type', type: 'select', col: 1, options: [
        { label: 'Full time', value: 'FULL_TIME' }, { label: 'Part time', value: 'PART_TIME' },
        { label: 'Contract', value: 'CONTRACT' }, { label: 'Intern', value: 'INTERN' },
      ] },
      { name: 'joinedAt', label: 'Joined on', type: 'date', col: 1 },
      { name: 'ctc', label: 'Annual CTC', type: 'currency', col: 1 },
      { name: 'pan', label: 'PAN', type: 'text', col: 1 },
      { name: 'bankAccount', label: 'Bank account', type: 'text', col: 1 },
      { name: 'address', label: 'Address', type: 'textarea', col: 2 },
      { name: 'status', label: 'Status', type: 'select', col: 1, options: [
        { label: 'Active', value: 'ACTIVE' }, { label: 'On notice', value: 'NOTICE' }, { label: 'Exited', value: 'EXITED' },
      ] },
    ],
  },

  departments: {
    key: 'departments',
    label: 'Departments',
    singular: 'Department',
    endpoint: '/hrms/departments',
    permission: 'hrms',
    icon: Building,
    columns: [{ key: 'name', label: 'Department' }, { key: 'head', label: 'Head' }],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'head', label: 'Head', type: 'text', col: 1 },
    ],
  },

  leaveTypes: {
    key: 'leaveTypes',
    label: 'Leave types',
    singular: 'Leave type',
    endpoint: '/hrms/leave-types',
    permission: 'hrms',
    icon: Palmtree,
    columns: [
      { key: 'name', label: 'Type' },
      { key: 'quotaDays', label: 'Quota', type: 'number' },
      { key: 'paid', label: 'Paid', type: 'boolean' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, col: 1 },
      { name: 'quotaDays', label: 'Annual quota (days)', type: 'number', col: 1 },
      { name: 'paid', label: 'Paid leave', type: 'boolean', col: 1 },
    ],
  },

  jobs: {
    key: 'jobs',
    label: 'Job openings',
    singular: 'Opening',
    endpoint: '/recruitment/jobs',
    permission: 'recruitment',
    icon: UserSearch,
    columns: [
      { key: 'title', label: 'Role' },
      { key: 'location', label: 'Location' },
      { key: 'type', label: 'Type', type: 'badge' },
      { key: 'openings', label: 'Openings', type: 'number' },
      { key: 'state', label: 'State', type: 'badge' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 1 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, col: 1 },
      { name: 'location', label: 'Location', type: 'text', col: 1 },
      { name: 'type', label: 'Employment type', type: 'select', col: 1, options: [
        { label: 'Full time', value: 'FULL_TIME' }, { label: 'Part time', value: 'PART_TIME' },
        { label: 'Contract', value: 'CONTRACT' }, { label: 'Internship', value: 'INTERN' },
      ] },
      { name: 'experience', label: 'Experience', type: 'text', col: 1 },
      { name: 'salaryRange', label: 'Salary range', type: 'text', col: 1 },
      { name: 'openings', label: 'Openings', type: 'number', col: 1 },
      { name: 'skills', label: 'Skills', type: 'tags', col: 2 },
      { name: 'description', label: 'Description', type: 'richtext', col: 2 },
      stateField,
    ],
  },

  applications: {
    key: 'applications',
    label: 'Applications',
    singular: 'Application',
    endpoint: '/recruitment/applications',
    permission: 'recruitment',
    icon: Inbox,
    columns: [
      { key: 'name', label: 'Candidate' },
      { key: 'job.title', label: 'Role' },
      { key: 'email', label: 'Email' },
      { key: 'stage', label: 'Stage', type: 'badge' },
      { key: 'rating', label: 'Rating', type: 'number' },
      { key: 'createdAt', label: 'Applied', type: 'date' },
    ],
    fields: [
      { name: 'jobId', label: 'Role', type: 'select', optionsFrom: '/recruitment/jobs', optionLabel: 'title', required: true, col: 1 },
      { name: 'name', label: 'Candidate name', type: 'text', required: true, col: 1 },
      { name: 'email', label: 'Email', type: 'email', required: true, col: 1 },
      { name: 'phone', label: 'Phone', type: 'text', col: 1 },
      { name: 'resumeId', label: 'Résumé', type: 'media', accept: 'PDF,DOC', col: 1 },
      { name: 'portfolio', label: 'Portfolio', type: 'url', col: 1 },
      { name: 'stage', label: 'Stage', type: 'select', col: 1, options: [
        { label: 'Applied', value: 'APPLIED' }, { label: 'Screening', value: 'SCREEN' },
        { label: 'Interview', value: 'INTERVIEW' }, { label: 'Offer', value: 'OFFER' },
        { label: 'Hired', value: 'HIRED' }, { label: 'Rejected', value: 'REJECTED' },
      ] },
      { name: 'rating', label: 'Rating (0-5)', type: 'number', col: 1 },
      { name: 'coverNote', label: 'Cover note', type: 'textarea', col: 2 },
    ],
  },

  tasks: {
    key: 'tasks',
    label: 'Tasks',
    singular: 'Task',
    endpoint: '/tasks',
    permission: 'tasks',
    icon: ListTodo,
    columns: [
      { key: 'title', label: 'Task' },
      { key: 'owner.name', label: 'Owner' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'priority', label: 'Priority', type: 'badge' },
      { key: 'dueAt', label: 'Due', type: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 2 },
      { name: 'detail', label: 'Detail', type: 'textarea', col: 2 },
      { name: 'status', label: 'Status', type: 'select', col: 1, options: [
        { label: 'To do', value: 'TODO' }, { label: 'Doing', value: 'DOING' },
        { label: 'Review', value: 'REVIEW' }, { label: 'Done', value: 'DONE' },
      ] },
      { name: 'priority', label: 'Priority', type: 'select', col: 1, options: [
        { label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' }, { label: 'Urgent', value: 'URGENT' },
      ] },
      { name: 'dueAt', label: 'Due date', type: 'date', col: 1 },
      { name: 'ownerId', label: 'Owner', type: 'select', optionsFrom: '/users', optionLabel: 'name', col: 1 },
      { name: 'tags', label: 'Tags', type: 'tags', col: 2 },
    ],
  },

  events: {
    key: 'events',
    label: 'Calendar',
    singular: 'Event',
    endpoint: '/calendar',
    permission: 'calendar',
    icon: CalendarDays,
    columns: [
      { key: 'title', label: 'Event' },
      { key: 'kind', label: 'Kind', type: 'badge' },
      { key: 'start', label: 'Start', type: 'date' },
      { key: 'end', label: 'End', type: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, col: 2 },
      { name: 'detail', label: 'Detail', type: 'textarea', col: 2 },
      { name: 'start', label: 'Start', type: 'datetime', required: true, col: 1 },
      { name: 'end', label: 'End', type: 'datetime', required: true, col: 1 },
      { name: 'allDay', label: 'All day', type: 'boolean', col: 1 },
      { name: 'kind', label: 'Kind', type: 'select', col: 1, options: [
        { label: 'Meeting', value: 'meeting' }, { label: 'Review', value: 'review' },
        { label: 'Workshop', value: 'workshop' }, { label: 'Deadline', value: 'deadline' },
      ] },
      { name: 'attendees', label: 'Attendees', type: 'tags', col: 2 },
    ],
  },

  templates: {
    key: 'templates',
    label: 'Email templates',
    singular: 'Template',
    endpoint: '/messaging/templates',
    permission: 'messaging',
    icon: Mail,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'subject', label: 'Subject' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { name: 'name', label: 'Key', type: 'text', required: true, col: 1 },
      { name: 'subject', label: 'Subject', type: 'text', required: true, col: 1 },
      { name: 'html', label: 'HTML body', type: 'richtext', col: 2, help: 'Use {{variable}} placeholders' },
      { name: 'variables', label: 'Variables', type: 'tags', col: 2 },
    ],
  },
};

export type NavItem = { label: string; href: string; icon: LucideIcon; permission?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
      { label: 'Analytics', href: '/analytics', icon: LineChart, permission: 'analytics:read' },
      { label: 'Reports', href: '/reports', icon: FileBarChart, permission: 'reports:read' },
    ],
  },
  {
    label: 'Website CMS',
    items: [
      { label: 'Hero', href: '/cms/heroes', icon: Sparkles, permission: 'cms:read' },
      { label: 'Services', href: '/cms/services', icon: Layers, permission: 'cms:read' },
      { label: 'Projects', href: '/cms/projects', icon: FolderKanban, permission: 'cms:read' },
      { label: 'Clients', href: '/cms/clients', icon: Building2, permission: 'cms:read' },
      { label: 'Team', href: '/cms/team', icon: Users, permission: 'cms:read' },
      { label: 'Gallery', href: '/cms/gallery', icon: Images, permission: 'cms:read' },
      { label: 'Pages', href: '/cms/pages', icon: FileText, permission: 'cms:read' },
      { label: 'SEO', href: '/cms/seo', icon: Search, permission: 'seo:read' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog posts', href: '/blog/posts', icon: FileText, permission: 'blog:read' },
      { label: 'Categories', href: '/blog/categories', icon: FolderTree, permission: 'blog:read' },
      { label: 'Tags', href: '/blog/tags', icon: FolderTree, permission: 'blog:read' },
      { label: 'Comments', href: '/blog/comments', icon: MessageCircle, permission: 'blog:read' },
      { label: 'Media manager', href: '/media', icon: HardDrive, permission: 'media:read' },
      { label: 'File manager', href: '/media/files', icon: FolderTree, permission: 'media:read' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Meta Ads', href: '/marketing/meta', icon: Megaphone, permission: 'ads:read' },
      { label: 'Google Ads', href: '/marketing/google', icon: Megaphone, permission: 'ads:read' },
      { label: 'Email', href: '/messaging/email', icon: Mail, permission: 'messaging:send' },
      { label: 'WhatsApp', href: '/messaging/whatsapp', icon: MessageCircle, permission: 'messaging:send' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Pipeline', href: '/crm', icon: LineChart, permission: 'crm:read' },
      { label: 'Leads', href: '/crm/leads', icon: Contact, permission: 'crm:read' },
      { label: 'Deals', href: '/crm/deals', icon: Briefcase, permission: 'crm:read' },
      { label: 'Contact forms', href: '/crm/contacts', icon: Inbox, permission: 'crm:read' },
    ],
  },
  {
    label: 'HRMS',
    items: [
      { label: 'Employees', href: '/hrms/employees', icon: Users, permission: 'hrms:read' },
      { label: 'Departments', href: '/hrms/departments', icon: Building, permission: 'hrms:read' },
      { label: 'Attendance', href: '/hrms/attendance', icon: CalendarCheck, permission: 'hrms:read' },
      { label: 'Leave', href: '/hrms/leave', icon: Palmtree, permission: 'hrms:read' },
      { label: 'Payroll', href: '/hrms/payroll', icon: Wallet, permission: 'hrms:read' },
      { label: 'Recruitment', href: '/recruitment/jobs', icon: UserSearch, permission: 'recruitment:read' },
      { label: 'Applications', href: '/recruitment/applications', icon: Inbox, permission: 'recruitment:read' },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Tasks', href: '/tasks', icon: ListTodo, permission: 'tasks:read' },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays, permission: 'calendar:read' },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users & roles', href: '/system/users', icon: ShieldCheck, permission: 'users:read' },
      { label: 'Audit logs', href: '/system/audit', icon: ScrollText, permission: 'audit:read' },
      { label: 'Backup & restore', href: '/system/backup', icon: DatabaseBackup, permission: 'backup:read' },
      { label: 'Settings', href: '/system/settings', icon: Settings, permission: 'settings:read' },
      { label: 'Brand kit', href: '/system/brand', icon: Palette, permission: 'settings:read' },
    ],
  },
];
