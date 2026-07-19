import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SteamStrategy } from 'passport-steam';
import { env } from './env.js';
import { loginOAuthUser } from '../services/authService.js';
import { normalizeSteamIdentifier } from '../services/steamAuthService.js';

function buildContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || ''
  };
}

if (env.googleClientId && env.googleClientSecret && env.googleCallbackUrl) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
        passReqToCallback: true
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value || null;
          const displayName = profile?.displayName || email || `Google-${profile.id}`;
          const session = await loginOAuthUser({
            provider: 'GOOGLE',
            providerUserId: profile.id,
            email,
            displayName,
            context: buildContext(req)
          });
          done(null, session);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

if (env.steamRealm && env.steamReturnUrl) {
  passport.use(
    'steam',
    new SteamStrategy(
      {
        returnURL: env.steamReturnUrl,
        realm: env.steamRealm,
        profile: false,
        passReqToCallback: true
      },
      async (req, identifier, profile, done) => {
        try {
          const steamId = normalizeSteamIdentifier(profile?.id || identifier);
          const displayName = profile?.displayName || `Steam-${steamId.slice(-6)}`;
          const session = await loginOAuthUser({
            provider: 'STEAM',
            providerUserId: steamId,
            email: null,
            displayName,
            context: buildContext(req)
          });
          done(null, session);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export { passport };
