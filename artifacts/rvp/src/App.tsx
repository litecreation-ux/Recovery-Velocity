import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/Dashboard';
import ReviewGate from '@/pages/ReviewGate';
import AgentMonitor from '@/pages/AgentMonitor';
import ParishManagerDashboard from '@/pages/ParishManagerDashboard';
import ParishIncidentCommand from '@/pages/ParishIncidentCommand';
import FieldOfficer from '@/pages/FieldOfficer';
import PrivateSectorPartner from '@/pages/PrivateSectorPartner';
import OpsWorkflow from '@/pages/OpsWorkflow';
import TaskManager from '@/pages/TaskManager';
import UnifiedCommand from '@/pages/UnifiedCommand';
import PublicParishResilience from '@/pages/PublicParishResilience';
import Shell from '@/components/layout/Shell';
import { RoleProvider, useRole } from '@/contexts/RoleContext';
import { CountryProvider } from '@/contexts/CountryContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import Onboarding from '@/pages/Onboarding';
import Organization from '@/pages/Organization';
import Communications from '@/pages/Communications';
import PublicAlerts from '@/pages/PublicAlerts';

import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const externalClerk = import.meta.env.VITE_CLERK_EXTERNAL === "true";
const clerkPubKey = externalClerk
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#174D7C",
    colorForeground: "#172033",
    colorMutedForeground: "#64748B",
    colorDanger: "hsl(0 84.2% 60.2%)",
    colorBackground: "#FFFFFF",
    colorInput: "#FFFFFF",
    colorInputForeground: "#172033",
    colorNeutral: "#E2E8F0",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-xl w-full max-w-[420px] overflow-hidden border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.12)]",
    card: "!shadow-none !border-0 !bg-transparent !p-8",
    footer: "!shadow-none !border-0 !bg-transparent !p-8 !pt-0",
    headerTitle: "text-2xl text-slate-900 font-semibold tracking-tight uppercase",
    headerSubtitle: "text-slate-600 text-sm mt-2",
    socialButtonsBlockButtonText: "text-slate-800 text-sm font-medium",
    formFieldLabel: "text-slate-700 text-sm font-medium",
    footerActionLink: "text-[#0B3A67] hover:text-[#082B4D] transition-colors text-sm font-medium",
    footerActionText: "text-slate-600 text-sm",
    dividerText: "text-slate-500 text-xs uppercase tracking-widest",
    identityPreviewEditButton: "text-primary hover:text-primary/80 transition-colors",
    formFieldSuccessText: "text-emerald-500 font-mono text-xs",
    alertText: "text-foreground font-mono text-xs",
    logoBox: "mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(var(--primary),0.15)]",
    logoImage: "w-8 h-8",
    socialButtonsBlockButton: "border border-slate-300 bg-white hover:bg-slate-50 transition-colors",
    formButtonPrimary: "bg-[#174D7C] text-white hover:bg-[#123E65] transition-colors h-11 font-semibold",
    formFieldInput: "bg-white border border-slate-300 text-slate-900 h-11 focus:ring-2 focus:ring-[#174D7C]/20 focus:border-[#174D7C] transition-colors placeholder:text-slate-400 text-sm",
    footerAction: "hidden",
    dividerLine: "bg-slate-200",
    alert: "border border-destructive/50 bg-destructive/10 text-destructive font-mono text-xs",
    otpCodeFieldInput: "border-border bg-background/50 text-foreground focus:border-primary focus:ring-primary",
    formFieldRow: "space-y-4",
    main: "p-0",
  },
};

function SignInPage() {
  return (
    <AuthLayout>
      <div className="space-y-5">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} withSignUp={false} />
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-4 text-center">
          <p className="text-sm font-medium text-slate-900">Need access for your organization?</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Contact the RVP team to get started. Existing members can sign in above and will be taken to their organization.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthLayout>
  );
}

// Helps user's webview stay up-to-date when the signed-in user changes by invalidating the QueryClient cache.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Router() {
  const { role, isAuthorityLoading } = useRole();
  const { isLoaded, isSignedIn } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;
    // Allow public access
    if (location.startsWith('/public/')) return;
    if (!isSignedIn) {
      setLocation('/sign-in');
      return;
    }
    if (location === '/onboarding' || location === '/organization') return;

    // Signed in users without role should go to onboarding (unless they're going to organization)
    if (isSignedIn && !isAuthorityLoading && !role) {
      if (location !== '/onboarding' && location !== '/organization') {
        setLocation('/onboarding');
        return;
      }
    }

    // Operational route handling when signed in with a role
    if (isSignedIn && !isAuthorityLoading && role) {
      if (role === 'field_officer' && location !== '/' && location !== '/field-officer' && location !== '/unified-command' && location !== '/communications' && !location.startsWith('/public/')) {
        setLocation('/field-officer');
        return;
      }
      if (
        role === 'parish_manager' &&
        location !== '/' &&
        location !== '/review' &&
        location !== '/task-manager' &&
        location !== '/unified-command' &&
         location !== '/communications' &&
        !location.startsWith('/ops/') &&
        !location.startsWith('/public/')
      ) {
        setLocation('/ops/incidents');
      }
    }
  }, [location, role, isAuthorityLoading, isLoaded, isSignedIn, setLocation]);

  if (location === '/public/parishes') {
    return (
      <RoutedErrorBoundary>
        <PublicParishResilience />
      </RoutedErrorBoundary>
    );
  }
  if (location === '/public/alerts') {
    return <RoutedErrorBoundary><PublicAlerts /></RoutedErrorBoundary>;
  }

  if (!isLoaded || (isSignedIn && isAuthorityLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
         <div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" />
      </div>
    );
  }

  // Signed-out operational routes are redirected to the login page.
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-sky-400/30" />
      </div>
    );
  }

  // Signed in but no role -> onboarding or org pages allowed
  if (!role) {
    if (location === '/organization') {
      return (
        <Shell>
          <RoutedErrorBoundary>
            <Organization />
          </RoutedErrorBoundary>
        </Shell>
      );
    }
    return (
      <Shell>
        <RoutedErrorBoundary>
          <Onboarding />
        </RoutedErrorBoundary>
      </Shell>
    );
  }

  // Signed in and has role -> organization page allowed for everyone who has role too
  if (location === '/organization') {
    return (
      <Shell>
        <RoutedErrorBoundary>
          <Organization />
        </RoutedErrorBoundary>
      </Shell>
    );
  }

  if (location === '/onboarding') {
    return (
      <Shell>
        <RoutedErrorBoundary>
          <Onboarding />
        </RoutedErrorBoundary>
      </Shell>
    );
  }

  if (role === 'field_officer') {
    return (
      <Shell>
        <Switch>
          <Route path="/" component={FieldOfficer} />
          <Route path="/field-officer" component={FieldOfficer} />
          <Route path="/unified-command" component={UnifiedCommand} />
           <Route path="/communications" component={Communications} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    );
  }

  if (role === 'system_admin') {
    return (
      <Shell>
        <Switch>
          <Route path="/" component={AgentMonitor} />
          <Route path="/agents" component={AgentMonitor} />
           <Route path="/communications" component={Communications} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    );
  }

  if (role === 'private_sector_partner') {
    return (
      <Shell>
        <Switch>
          <Route path="/" component={PrivateSectorPartner} />
           <Route path="/communications" component={Communications} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    );
  }

  if (role === 'parish_manager') {
    return (
      <Shell>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={ParishManagerDashboard} />
            <Route path="/ops/:section" component={OpsWorkflow} />
            <Route path="/review" component={ParishIncidentCommand} />
            <Route path="/task-manager" component={TaskManager} />
            <Route path="/unified-command" component={UnifiedCommand} />
             <Route path="/communications" component={Communications} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </Shell>
    );
  }

  // national_coordinator — full access
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/field-officer" component={FieldOfficer} />
          <Route path="/ops/:section" component={OpsWorkflow} />
          <Route path="/review" component={ReviewGate} />
          <Route path="/task-manager" component={TaskManager} />
          <Route path="/agents" component={AgentMonitor} />
          <Route path="/unified-command" component={UnifiedCommand} />
           <Route path="/communications" component={Communications} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "RVP SYSTEM ACCESS",
            subtitle: "Enter operational credentials",
          },
        },
        signUp: {
          start: {
            title: "ACTIVATE CREDENTIALS",
            subtitle: "Verify invitation and setup account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <RoleProvider>
            <CountryProvider>
              <Switch>
                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                <Route path="/*" component={Router} />
              </Switch>
            </CountryProvider>
          </RoleProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/service-worker.js`).catch(() => {
        // The public app remains usable when service workers are unavailable.
      });
    }
  }, []);

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
      <Toaster />
    </WouterRouter>
  );
}

export default App;