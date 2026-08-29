import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { User } from '../modules/users/user.model';
import { logger } from '../utils/logger';

export function configurePassport(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    logger.debug('Google OAuth credentials not configured; skipping strategy registration');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              if (profile.photos?.[0]?.value && !user.avatar) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
            } else {
              user = new User({
                email,
                name: profile.displayName || email.split('@')[0],
                avatar: profile.photos?.[0]?.value,
                googleId: profile.id,
                role: 'user',
              });
              await user.save();
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  logger.info('Passport Google OAuth strategy configured');
}
