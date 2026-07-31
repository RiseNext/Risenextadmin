import { PrismaClient, Role, PublishState } from '@prisma/client';
import argon2 from 'argon2';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

const slug = (s: string) => s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  console.log('› seeding Rise Next…');

  // ── users ──
  const passwords = {
    admin: await argon2.hash('RiseNext@2026'),
    staff: await argon2.hash('RiseNext@Staff'),
  };

  const users = await Promise.all(
    [
      { name: 'Rise Next Owner', email: 'admin@risenext.in', role: Role.SUPER_ADMIN, hash: passwords.admin },
      { name: 'Aarav Mehta', email: 'ops@risenext.in', role: Role.ADMIN, hash: passwords.staff },
      { name: 'Diya Sharma', email: 'content@risenext.in', role: Role.EDITOR, hash: passwords.staff },
      { name: 'Kabir Rao', email: 'hr@risenext.in', role: Role.HR, hash: passwords.staff },
      { name: 'Meera Iyer', email: 'growth@risenext.in', role: Role.MARKETING, hash: passwords.staff },
      { name: 'Rohan Gupta', email: 'sales@risenext.in', role: Role.SALES, hash: passwords.staff },
      { name: 'Sana Khan', email: 'designer@risenext.in', role: Role.EMPLOYEE, hash: passwords.staff },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { name: u.name, email: u.email, role: u.role, passwordHash: u.hash },
      })
    )
  );
  const owner = users[0];
  const editor = users[2];

  // ── site settings ──
  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      brandName: 'Rise Next',
      tagline: 'Brands that rise, next.',
      email: 'hello@risenext.in',
      phone: '+91 90000 12345',
      address: 'Jubilee Hills, Hyderabad, Telangana 500033',
      socials: { instagram: 'https://instagram.com/risenext', linkedin: 'https://linkedin.com/company/risenext', youtube: '' },
      theme: { cream: '#F5F2E8', ink: '#14110C', ember: '#C2571F', moss: '#3F4A34' },
    },
  });

  // ── hero ──
  await prisma.hero.createMany({
    data: [
      {
        eyebrow: 'Full-funnel growth studio',
        headline: 'Brands that rise, next.',
        subline: 'Strategy, film, performance media — built in one room.',
        body: 'We partner with ambitious Indian brands to design demand, not just campaigns.',
        ctaLabel: 'Start a project',
        ctaHref: '/contact',
        altCta: 'See our work',
        altHref: '/work',
        order: 0,
        state: PublishState.PUBLISHED,
      },
      {
        eyebrow: 'Now onboarding',
        headline: 'Performance that compounds.',
        subline: 'Meta and Google systems tuned weekly, reported honestly.',
        ctaLabel: 'Book a growth audit',
        ctaHref: '/contact',
        order: 1,
        state: PublishState.DRAFT,
      },
    ],
  });

  // ── services ──
  const serviceSeeds = [
    ['Brand Strategy', 'Positioning, naming and identity systems that hold up in market.', ['Positioning sprint', 'Naming', 'Identity system', 'Brand book']],
    ['Performance Marketing', 'Meta and Google media built around contribution margin.', ['Full-funnel media', 'Creative testing', 'Landing pages', 'Weekly reporting']],
    ['Film & Content', 'Production that feeds the funnel, not just the showreel.', ['Brand films', 'Product shoots', 'Reels engine', 'Podcast studio']],
    ['Web & Product', 'Fast, accessible sites and dashboards that convert.', ['Design systems', 'Next.js builds', 'CRO', 'Analytics']],
    ['Social Media', 'Always-on channels with a real editorial spine.', ['Content calendar', 'Community', 'Influencer', 'Listening']],
    ['SEO & Content', 'Compounding organic demand across search and AI answers.', ['Technical SEO', 'Topical clusters', 'Digital PR', 'Reporting']],
  ];
  const services = [];
  for (const [i, [title, summary, features]] of serviceSeeds.entries()) {
    services.push(
      await prisma.service.create({
        data: {
          title: title as string,
          slug: slug(title as string),
          summary: summary as string,
          description: `${summary} Delivered by a senior pod with a single point of contact.`,
          features: features as string[],
          priceFrom: 75000 + i * 25000,
          order: i,
          state: PublishState.PUBLISHED,
        },
      })
    );
  }

  // ── clients ──
  const clientSeeds = [
    ['Anvaya Homes', 'Real estate', 'Rise Next rebuilt our funnel — site visits doubled in a quarter.', 'Sneha Reddy', 'CMO'],
    ['Kettle & Co', 'F&B', 'They turned our launch into a city-wide conversation.', 'Vikram Nair', 'Founder'],
    ['Nirvana Wellness', 'Healthcare', 'Cost per consult dropped 41% within eight weeks.', 'Dr. Anita Rao', 'Director'],
    ['Zenith Motors', 'Automotive', 'The most organised agency partner we have worked with.', 'Imran Sheikh', 'Head of Marketing'],
    ['Praana Labs', 'D2C', 'Creative testing finally gave us a repeatable winner.', 'Tara Bose', 'Growth Lead'],
    ['Skyline Interiors', 'Interiors', 'Beautiful work, unusually clear reporting.', 'Rahul Verma', 'Partner'],
  ];
  const clients = [];
  for (const [i, [name, industry, testimonial, author, authorRole] ] of clientSeeds.entries()) {
    clients.push(
      await prisma.client.create({
        data: {
          name: name as string, industry: industry as string, testimonial: testimonial as string,
          author: author as string, authorRole: authorRole as string, order: i, state: PublishState.PUBLISHED,
        },
      })
    );
  }

  // ── projects ──
  const projectSeeds = [
    ['Anvaya Launch Campaign', 0, 0, ['2.1x qualified site visits', '₹412 cost per lead', '18% booking uplift']],
    ['Kettle & Co City Launch', 1, 2, ['4.6M organic views', '11k first-week footfall']],
    ['Nirvana Consult Engine', 2, 1, ['-41% cost per consult', '3.2x consult volume']],
    ['Zenith Test Drive Funnel', 3, 1, ['+64% test drives', '₹98 cost per click to booking']],
    ['Praana Creative System', 4, 2, ['31 creatives tested', '2.4 ROAS sustained']],
    ['Skyline Portfolio Site', 5, 3, ['1.2s LCP', '+58% enquiry rate']],
  ];
  for (const [i, [title, clientIdx, serviceIdx, results]] of projectSeeds.entries()) {
    await prisma.project.create({
      data: {
        title: title as string,
        slug: slug(title as string),
        clientId: clients[clientIdx as number].id,
        serviceId: services[serviceIdx as number].id,
        summary: 'A full-funnel engagement from positioning through to weekly media optimisation.',
        description: 'Discovery, creative platform, production sprint, then always-on media with weekly reviews.',
        results: results as string[],
        year: 2025 + (i % 2),
        featured: i < 3,
        order: i,
        state: PublishState.PUBLISHED,
      },
    });
  }

  // ── team ──
  const team = [
    ['Aarav Mehta', 'Founder & Strategy'],
    ['Meera Iyer', 'Head of Growth'],
    ['Diya Sharma', 'Creative Director'],
    ['Kabir Rao', 'People & Culture'],
    ['Rohan Gupta', 'Client Partner'],
    ['Sana Khan', 'Design Lead'],
  ];
  for (const [i, [name, role]] of team.entries()) {
    await prisma.teamMember.create({
      data: {
        name, role,
        bio: `${name} leads ${role.toLowerCase()} at Rise Next.`,
        email: `${slug(name.split(' ')[0])}@risenext.in`,
        order: i,
        state: PublishState.PUBLISHED,
      },
    });
  }

  // ── gallery ──
  for (const [i, [title, kind]] of [
    ['Studio Days', 'photo'], ['Brand Films', 'video'], ['Reels Engine', 'reel'], ['Rise Talks', 'podcast'],
  ].entries()) {
    await prisma.galleryAlbum.create({
      data: { title, slug: slug(title), kind, caption: 'Behind the work at Rise Next.', order: i, state: PublishState.PUBLISHED },
    });
  }

  // ── blog ──
  const categories = await Promise.all(
    ['Growth', 'Brand', 'Craft', 'Culture'].map((name) =>
      prisma.category.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name) } })
    )
  );
  const tags = await Promise.all(
    ['meta-ads', 'google-ads', 'seo', 'branding', 'video', 'analytics'].map((name) =>
      prisma.tag.upsert({ where: { slug: name }, update: {}, create: { name, slug: name } })
    )
  );
  const postSeeds = [
    'The only three ad metrics that matter in year one',
    'How we build a creative testing calendar that survives contact with reality',
    'Positioning before performance: the audit we run on every new brand',
    'What a ₹5 lakh monthly media budget should actually buy you',
    'Designing for AI search: structure your content like an answer',
    'Why we film in-house (and what it costs)',
  ];
  for (const [i, title] of postSeeds.entries()) {
    await prisma.post.create({
      data: {
        title,
        slug: slug(title),
        excerpt: 'A practical note from the Rise Next studio floor.',
        content: `## ${title}\n\nWe write these after client reviews, so the advice is the same advice we give in the room.\n\n- Start with the offer\n- Then the audience\n- Then the creative\n- Only then the media plan\n`,
        readMinutes: 4 + (i % 4),
        authorId: i % 2 ? editor.id : owner.id,
        categoryId: categories[i % categories.length].id,
        tags: { connect: [{ id: tags[i % tags.length].id }, { id: tags[(i + 2) % tags.length].id }] },
        state: i < 4 ? PublishState.PUBLISHED : PublishState.DRAFT,
        publishedAt: i < 4 ? dayjs().subtract(i * 6, 'day').toDate() : null,
        views: 120 * (i + 1),
      },
    });
  }

  // ── SEO ──
  for (const [path, title, description] of [
    ['/', 'Rise Next — Full-funnel growth studio in Hyderabad', 'Brand strategy, film and performance media for ambitious Indian brands.'],
    ['/services', 'Services — Rise Next', 'Strategy, media, film, web and SEO delivered by one senior pod.'],
    ['/work', 'Work — Rise Next', 'Selected campaigns, launches and growth systems.'],
    ['/blog', 'Notes — Rise Next', 'Practical notes on brand and performance marketing.'],
    ['/careers', 'Careers — Rise Next', 'Join a studio that ships.'],
    ['/contact', 'Contact — Rise Next', 'Start a project with Rise Next, Hyderabad.'],
  ]) {
    await prisma.seo.upsert({
      where: { path },
      update: {},
      create: { path, title, description, keywords: ['growth marketing', 'hyderabad agency', 'performance marketing'] },
    });
  }

  // ── HRMS ──
  const departments = await Promise.all(
    ['Strategy', 'Growth', 'Creative', 'Production', 'Technology', 'People'].map((name) =>
      prisma.department.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const leaveTypes = await Promise.all(
    [['Casual Leave', 12], ['Sick Leave', 8], ['Earned Leave', 15], ['Unpaid Leave', 0]].map(([name, quota]) =>
      prisma.leaveType.upsert({
        where: { name: name as string },
        update: {},
        create: { name: name as string, quotaDays: quota as number, paid: (quota as number) > 0 },
      })
    )
  );

  const employeeSeeds = [
    ['RN001', 'Aarav', 'Mehta', 'Founder & Strategy', 0, 3600000, users[1].id],
    ['RN002', 'Meera', 'Iyer', 'Head of Growth', 1, 2400000, users[4].id],
    ['RN003', 'Diya', 'Sharma', 'Creative Director', 2, 2100000, users[2].id],
    ['RN004', 'Kabir', 'Rao', 'People Lead', 5, 1500000, users[3].id],
    ['RN005', 'Rohan', 'Gupta', 'Client Partner', 1, 1400000, users[5].id],
    ['RN006', 'Sana', 'Khan', 'Design Lead', 2, 1250000, users[6].id],
    ['RN007', 'Neel', 'Prasad', 'Media Buyer', 1, 900000, null],
    ['RN008', 'Ishita', 'Menon', 'Content Writer', 2, 720000, null],
    ['RN009', 'Yash', 'Kulkarni', 'Video Editor', 3, 780000, null],
    ['RN010', 'Priya', 'Nambiar', 'Full-stack Engineer', 4, 1800000, null],
  ];
  const employees = [];
  for (const [i, [code, firstName, lastName, designation, dept, ctc, userId]] of employeeSeeds.entries()) {
    employees.push(
      await prisma.employee.create({
        data: {
          code: code as string,
          firstName: firstName as string,
          lastName: lastName as string,
          email: `${slug(firstName as string)}@risenext.in`,
          phone: `+9190000${String(10000 + i).slice(-5)}`,
          designation: designation as string,
          departmentId: departments[dept as number].id,
          ctc: ctc as number,
          userId: (userId as string | null) ?? undefined,
          joinedAt: dayjs().subtract(90 + i * 40, 'day').toDate(),
          pan: `ABCDE${1000 + i}F`,
          address: 'Hyderabad, Telangana',
        },
      })
    );
  }

  // attendance for the last 20 working days
  for (const e of employees) {
    for (let d = 0; d < 20; d++) {
      const day = dayjs().subtract(d, 'day');
      if (day.day() === 0 || day.day() === 6) continue;
      const roll = Math.random();
      const status = roll > 0.94 ? 'ABSENT' : roll > 0.86 ? 'WFH' : 'PRESENT';
      const checkIn = day.hour(10).minute(Math.floor(Math.random() * 40)).toDate();
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: e.id, date: day.startOf('day').toDate() } },
        update: {},
        create: {
          employeeId: e.id,
          date: day.startOf('day').toDate(),
          status,
          checkIn: status === 'ABSENT' ? null : checkIn,
          checkOut: status === 'ABSENT' ? null : dayjs(checkIn).add(9, 'hour').toDate(),
          minutes: status === 'ABSENT' ? 0 : 540,
        },
      });
    }
  }

  for (const [i, e] of employees.slice(0, 5).entries()) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: e.id,
        typeId: leaveTypes[i % leaveTypes.length].id,
        from: dayjs().add(i + 2, 'day').toDate(),
        to: dayjs().add(i + 3, 'day').toDate(),
        days: 2,
        reason: 'Family function',
        status: i === 0 ? 'APPROVED' : 'PENDING',
      },
    });
  }

  const month = dayjs().month() + 1;
  const year = dayjs().year();
  for (const e of employees) {
    const monthly = Math.round(e.ctc / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    await prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: e.id, month, year } },
      update: {},
      create: {
        employeeId: e.id, month, year, basic, hra,
        allowances: monthly - basic - hra,
        deductions: Math.round(basic * 0.12),
        tds: Math.round(monthly * 0.05),
        netPay: monthly - Math.round(basic * 0.12) - Math.round(monthly * 0.05),
        status: 'APPROVED',
      },
    });
  }

  // ── recruitment ──
  const jobs = [];
  for (const [title, exp, skills] of [
    ['Performance Marketing Manager', '3-5 years', ['Meta Ads', 'Google Ads', 'GA4', 'Looker Studio']],
    ['Senior Video Editor', '2-4 years', ['Premiere Pro', 'After Effects', 'DaVinci']],
    ['Full-stack Engineer (Next.js)', '2-5 years', ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL']],
    ['Brand Copywriter', '1-3 years', ['Copywriting', 'Scripts', 'Editorial']],
  ]) {
    jobs.push(
      await prisma.jobOpening.create({
        data: {
          title: title as string,
          slug: slug(title as string),
          experience: exp as string,
          skills: skills as string[],
          description: `We are hiring a ${title} at our Hyderabad studio. You will work directly with senior leads and own outcomes.`,
          salaryRange: '₹6L – ₹18L',
          state: PublishState.PUBLISHED,
        },
      })
    );
  }
  const stages = ['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
  for (let i = 0; i < 18; i++) {
    await prisma.application.create({
      data: {
        jobId: jobs[i % jobs.length].id,
        name: ['Ananya Rao', 'Karan Malhotra', 'Fatima Ali', 'Dev Patel', 'Sara Joseph', 'Nikhil Shah'][i % 6],
        email: `candidate${i}@example.com`,
        phone: `+9198765${String(10000 + i).slice(-5)}`,
        portfolio: 'https://example.com/portfolio',
        coverNote: 'Excited about the work Rise Next puts out.',
        stage: stages[i % stages.length],
        rating: (i % 5) + 1,
        createdAt: dayjs().subtract(i, 'day').toDate(),
      },
    });
  }

  // ── CRM ──
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
  const leads = [];
  for (let i = 0; i < 40; i++) {
    leads.push(
      await prisma.lead.create({
        data: {
          name: ['Suresh Babu', 'Nandini Reddy', 'Arjun Kapoor', 'Zoya Rahman', 'Manish Jain', 'Lakshmi Iyer'][i % 6],
          email: `lead${i}@example.com`,
          phone: `+9197000${String(10000 + i).slice(-5)}`,
          company: ['Anvaya', 'Kettle & Co', 'Nirvana', 'Zenith', 'Praana', 'Skyline'][i % 6] + ' Pvt Ltd',
          source: ['website', 'meta', 'google', 'referral', 'linkedin'][i % 5],
          service: services[i % services.length].title,
          budget: [50000, 150000, 300000, 600000, 1000000][i % 5],
          message: 'Looking for a growth partner for the next two quarters.',
          status: leadStatuses[i % leadStatuses.length],
          score: (i * 7) % 100,
          createdAt: dayjs().subtract(i % 30, 'day').toDate(),
        },
      })
    );
  }
  for (const [i, lead] of leads.slice(0, 14).entries()) {
    await prisma.deal.create({
      data: {
        title: `${lead.company} — ${lead.service}`,
        leadId: lead.id,
        value: (lead.budget ?? 100000) * 3,
        stage: ['discovery', 'proposal', 'negotiation', 'won', 'lost'][i % 5],
        closeDate: dayjs().add((i % 6) + 1, 'week').toDate(),
      },
    });
    await prisma.activity.create({
      data: { leadId: lead.id, type: ['call', 'email', 'meeting', 'whatsapp', 'note'][i % 5], note: 'Discovery call completed.', doneAt: new Date() },
    });
  }
  for (let i = 0; i < 12; i++) {
    await prisma.contactSubmission.create({
      data: {
        name: `Website Visitor ${i + 1}`,
        email: `visitor${i}@example.com`,
        phone: `+9196000${String(10000 + i).slice(-5)}`,
        subject: ['New project', 'Careers', 'Partnership', 'Press'][i % 4],
        message: 'Please share your credentials deck and pricing.',
        page: ['/', '/services', '/work', '/contact'][i % 4],
        handled: i > 8,
        createdAt: dayjs().subtract(i, 'day').toDate(),
      },
    });
  }

  // ── ads + analytics ──
  for (const platform of ['META', 'GOOGLE'] as const) {
    for (let c = 0; c < 4; c++) {
      const spend = 40000 + c * 25000;
      const clicks = 900 + c * 420;
      const campaign = await prisma.adCampaign.create({
        data: {
          platform,
          name: `${platform === 'META' ? 'Meta' : 'Google'} — ${['Always On Leads', 'Retargeting', 'Launch Push', 'Brand Search'][c]}`,
          objective: ['LEAD_GENERATION', 'CONVERSIONS', 'REACH', 'SEARCH'][c],
          status: c === 3 ? 'PAUSED' : 'ACTIVE',
          dailyBudget: 2500 + c * 1500,
          spend,
          impressions: clicks * 55,
          clicks,
          leads: Math.round(clicks * 0.07),
          conversions: Math.round(clicks * 0.03),
          revenue: spend * (2 + c * 0.3),
          startDate: dayjs().subtract(60, 'day').toDate(),
          syncedAt: new Date(),
        },
      });
      for (let d = 29; d >= 0; d--) {
        const date = dayjs().subtract(d, 'day').startOf('day').toDate();
        const dayClicks = Math.round((clicks / 30) * (0.7 + Math.random() * 0.6));
        await prisma.adMetric.upsert({
          where: { campaignId_date: { campaignId: campaign.id, date } },
          update: {},
          create: {
            campaignId: campaign.id,
            date,
            spend: Math.round((spend / 30) * (0.8 + Math.random() * 0.4)),
            impressions: dayClicks * 55,
            clicks: dayClicks,
            leads: Math.round(dayClicks * 0.07),
          },
        });
      }
    }
  }

  for (let d = 59; d >= 0; d--) {
    const date = dayjs().subtract(d, 'day').startOf('day').toDate();
    const sessions = 800 + Math.round(Math.random() * 500) + (59 - d) * 6;
    await prisma.analyticsDaily.upsert({
      where: { date },
      update: {},
      create: {
        date,
        sessions,
        users: Math.round(sessions * 0.78),
        pageviews: Math.round(sessions * 2.6),
        bounceRate: +(38 + Math.random() * 12).toFixed(2),
        avgDuration: +(95 + Math.random() * 60).toFixed(1),
        topPages: [
          { path: '/', views: Math.round(sessions * 0.9) },
          { path: '/services', views: Math.round(sessions * 0.4) },
          { path: '/work', views: Math.round(sessions * 0.3) },
          { path: '/blog', views: Math.round(sessions * 0.2) },
          { path: '/contact', views: Math.round(sessions * 0.12) },
        ],
        channels: {
          organic: Math.round(sessions * 0.38),
          paid: Math.round(sessions * 0.3),
          social: Math.round(sessions * 0.18),
          direct: Math.round(sessions * 0.14),
        },
      },
    });
  }

  // ── tasks, calendar, notifications, templates ──
  const taskTitles = [
    'Ship Anvaya landing page v2', 'Review Kettle reel cuts', 'Rebuild Zenith audience sets',
    'Draft Q3 growth report', 'Interview: Performance Marketing Manager', 'Publish two SEO clusters',
    'Payroll approval — this month', 'Refresh credentials deck', 'Set up GA4 conversion imports',
  ];
  for (const [i, title] of taskTitles.entries()) {
    await prisma.task.create({
      data: {
        title,
        detail: 'Owned end-to-end, reviewed at the Monday stand-up.',
        status: ['TODO', 'DOING', 'REVIEW', 'DONE'][i % 4],
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
        dueAt: dayjs().add((i % 9) + 1, 'day').toDate(),
        ownerId: users[i % users.length].id,
        employeeId: employees[i % employees.length].id,
        tags: [['growth'], ['creative'], ['web'], ['people']][i % 4],
      },
    });
  }
  for (const [i, title] of ['Monday stand-up', 'Anvaya review', 'Creative jam', 'Payroll cutoff', 'Client QBR'].entries()) {
    await prisma.calendarEvent.create({
      data: {
        title,
        detail: 'Rise Next studio calendar.',
        start: dayjs().add(i, 'day').hour(11).minute(0).toDate(),
        end: dayjs().add(i, 'day').hour(12).minute(0).toDate(),
        kind: ['meeting', 'review', 'workshop', 'deadline', 'meeting'][i],
        attendees: ['ops@risenext.in', 'growth@risenext.in'],
      },
    });
  }
  for (const [i, title] of ['New enquiry from website', 'Payroll ready for approval', 'Meta campaign overspending', 'New job application'].entries()) {
    await prisma.notification.create({
      data: {
        title,
        body: 'Open the module to review.',
        kind: ['lead', 'hr', 'ads', 'recruitment'][i],
        href: ['/crm/leads', '/hrms/payroll', '/marketing/meta', '/recruitment/applications'][i],
      },
    });
  }
  for (const [name, subject, html, variables] of [
    ['lead-welcome', 'Thanks for reaching out, {{name}}', '<p>Hi {{name}},</p><p>We received your enquiry about {{service}} and will reply within one business day.</p><p>— Rise Next</p>', ['name', 'service']],
    ['interview-invite', 'Interview invite — {{role}}', '<p>Hi {{name}},</p><p>We would love to meet you for the {{role}} role on {{date}}.</p>', ['name', 'role', 'date']],
    ['payslip-ready', 'Your payslip for {{month}}', '<p>Hi {{name}},</p><p>Your payslip for {{month}} is now available in the portal.</p>', ['name', 'month']],
  ]) {
    await prisma.emailTemplate.upsert({
      where: { name: name as string },
      update: {},
      create: { name: name as string, subject: subject as string, html: html as string, variables: variables as string[] },
    });
  }

  console.log('✓ seed complete — admin@risenext.in / RiseNext@2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
