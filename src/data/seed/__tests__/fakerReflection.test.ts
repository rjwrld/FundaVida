import { describe, it, expect } from 'vitest'
import { Faker, en } from '@faker-js/faker'
import { faker as enFaker } from '@faker-js/faker/locale/en'

/**
 * Tripwire for the constructor-reflection seam in src/data/seed/index.ts
 * (#353): the seed cannot import faker's root barrel (any chunk rule touching
 * it force-includes every locale, ~2.7 MB), so `localizePeople` reaches the
 * Faker class through `faker.constructor` off the `locale/en` deep entry — an
 * implementation detail the `as` cast hides from the compiler. This test IS
 * allowed the barrel (tests don't ship), so it pins the two claims the seam
 * rests on. If a faker bump changes either, this fails loudly instead of
 * silently reshuffling the seeded world every e2e anchor derives from.
 */
describe('faker constructor reflection (seed seam)', () => {
  it('constructs a Faker whose seeded stream matches the public class byte-for-byte', () => {
    const FakerClass = enFaker.constructor as new (options: { locale: unknown }) => Faker
    const viaReflection = new FakerClass({ locale: enFaker.rawDefinitions })
    const viaPublicClass = new Faker({ locale: [en] })

    viaReflection.seed(42)
    viaPublicClass.seed(42)

    // The same draw mix localizePeople performs (helpers + string), repeated
    // enough to catch an off-by-one or altered generator, not just seed intake.
    const draw = (rng: Faker) =>
      Array.from({ length: 50 }, () => [
        rng.helpers.arrayElement(['6', '7', '8']),
        rng.string.numeric({ length: 7, allowLeadingZeros: true }),
        rng.number.int({ min: 0, max: 1000 }),
      ])

    expect(draw(viaReflection)).toEqual(draw(viaPublicClass))
  })

  it('still finds the reflection surface on the locale/en singleton', () => {
    expect(enFaker).toBeInstanceOf(Faker)
    expect(enFaker.rawDefinitions).toBeDefined()
  })
})
