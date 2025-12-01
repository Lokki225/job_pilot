import { PrismaClient, UserRole, JobPlatform, ApplicationStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Créer un utilisateur test
  const user = await prisma.user.create({
    data: {
      email: 'test@jobpilot.com',
      passwordHash: '$2b$10$hashedpassword', // En production, utilisez bcrypt
      role: UserRole.USER,
      profile: {
        create: {
          firstName: 'Franklin',
          lastName: 'Test',
          location: 'Abidjan, CI',
          skills: ['React', 'TypeScript', 'Next.js', 'Prisma'],
        },
      },
    },
  })

  console.log('✅ User created:', user.email)

  // Créer des jobs test
  const jobs = await prisma.job.createMany({
    data: [
      {
        title: 'Senior Frontend Developer',
        company: 'Tech Startup CI',
        platform: JobPlatform.LINKEDIN,
        url: 'https://linkedin.com/jobs/123',
        description: 'Nous recherchons un développeur React expérimenté...',
        location: 'Abidjan, CI',
        isRemote: true,
        salaryMin: 800000,
        salaryMax: 1500000,
        salaryCurrency: 'XOF',
        experienceLevel: 'Senior',
      },
      {
        title: 'Full Stack Developer',
        company: 'Digital Agency',
        platform: JobPlatform.INDEED,
        url: 'https://indeed.com/jobs/456',
        description: 'Stack: React, Node.js, PostgreSQL',
        location: 'Remote',
        isRemote: true,
        salaryMin: 600000,
        salaryMax: 1000000,
        salaryCurrency: 'XOF',
        experienceLevel: 'Mid-Level',
      },
      {
        title: 'React Developer - Freelance',
        company: 'Multiple Clients',
        platform: JobPlatform.FIVERR,
        description: 'Projets freelance variés en React',
        location: 'Remote',
        isRemote: true,
        experienceLevel: 'Junior',
      },
    ],
  })

  console.log(`✅ ${jobs.count} jobs created`)

  // Créer une application test
  const firstJob = await prisma.job.findFirst()
  
  if (firstJob) {
    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        jobId: firstJob.id,
        status: ApplicationStatus.PENDING,
        notes: 'Premier test d\'application',
      },
    })

    console.log('✅ Application created:', application.id)

    // Créer une lettre de motivation
    const letter = await prisma.letter.create({
      data: {
        userId: user.id,
        applicationId: application.id,
        content: `Chère équipe de recrutement,

        Je suis très intéressé par le poste de ${firstJob.title} chez ${firstJob.company}.

        Avec mes compétences en React, TypeScript et Next.js, je suis convaincu de pouvoir apporter une réelle valeur ajoutée à votre équipe.

        Cordialement,
        Franklin`,
      },
    })

    console.log('✅ Letter created:', letter.id)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })