export interface LandingFeature {
  titleKey: string
  captionKey: string
  altKey: string
  image: string
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    titleKey: 'landing.featurePreview.students.title',
    captionKey: 'landing.featurePreview.students.caption',
    altKey: 'landing.featurePreview.students.alt',
    image: '/screenshots/students.en.png',
  },
  {
    titleKey: 'landing.featurePreview.certificate.title',
    captionKey: 'landing.featurePreview.certificate.caption',
    altKey: 'landing.featurePreview.certificate.alt',
    image: '/screenshots/certificate.en.png',
  },
  {
    titleKey: 'landing.featurePreview.reports.title',
    captionKey: 'landing.featurePreview.reports.caption',
    altKey: 'landing.featurePreview.reports.alt',
    image: '/screenshots/reports.en.png',
  },
]
