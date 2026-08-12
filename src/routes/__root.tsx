import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { limparResiduosDeHospedagemAntiga } from "../lib/safe-storage";
import {
  ehErroDeVersaoAntiga,
  recarregarUmaVezPorVersaoNova,
} from "../lib/versao-nova";
import { AppNav } from "../components/AppNav";
import { PerfilGate } from "../components/PerfilGate";
import { ConfirmDialogHost } from "../components/ConfirmDialog";
import { PromptDialogHost } from "../components/PromptDialog";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl">404</h1>
        <h2 className="mt-4 text-xl">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Resto de hospedagem antiga (service worker, cache, sessão inválida) é a
    // causa mais comum de a página abrir e sumir. Limpamos aqui para que o
    // "Tentar de novo" já pegue o app limpo.
    limparResiduosDeHospedagemAntiga();
  }, [error]);

  const limparERecarregar = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignora */
    }
    limparResiduosDeHospedagemAntiga();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar de novo ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary/30"
          >
            Início
          </a>
          <button
            onClick={limparERecarregar}
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/30"
          >
            Limpar dados e recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        // viewport-fit=cover: sem isso o env(safe-area-inset-bottom) volta 0 e
        // a navegação de baixo fica embaixo da barra de gestos do iPhone.
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Estudo Rosa — Sua Plataforma Mágica de Estudos" },
      {
        name: "description",
        content:
          "Transforme seus PDFs em resumos e quizzes automáticos com o Estudo Rosa.",
      },
      { name: "author", content: "Estudo Rosa" },
      { property: "og:title", content: "Estudo Rosa" },
      {
        property: "og:description",
        content:
          "Envie um PDF de estudo e receba resumos e quiz com correção automática.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Roda uma vez por carregamento: derruba service worker e cache deixados
  // pela hospedagem anterior, que serviam arquivos antigos e quebravam a
  // página em natymed.com.br (funcionava em aba anônima).
  useEffect(() => {
    limparResiduosDeHospedagemAntiga();
  }, []);

  // Publicamos uma versão nova e a aba dela continua com a antiga? Os arquivos
  // que o navegador ainda espera não existem mais no servidor. O Vite avisa
  // nesses casos e a gente recarrega sozinho, em vez de quebrar na cara dela.
  useEffect(() => {
    const aoFalharPreload = () => {
      recarregarUmaVezPorVersaoNova();
    };
    const aoRejeitar = (e: PromiseRejectionEvent) => {
      if (ehErroDeVersaoAntiga(e.reason)) recarregarUmaVezPorVersaoNova();
    };
    window.addEventListener("vite:preloadError", aoFalharPreload);
    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => {
      window.removeEventListener("vite:preloadError", aoFalharPreload);
      window.removeEventListener("unhandledrejection", aoRejeitar);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConditionalGates>
        {/* pb no celular: a navegação fica fixa embaixo e cobriria o fim da
            página (botão de salvar, último cartão, rodapé) sem essa folga. */}
        <div className="min-h-screen pb-24 sm:pb-0">
          <AppNav />
          <Outlet />
        </div>
      </ConditionalGates>
      <ConfirmDialogHost />
      <PromptDialogHost />
    </QueryClientProvider>
  );
}

function ConditionalGates({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isPublic = location.pathname === "/";

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <PerfilGate>
      {children}
    </PerfilGate>
  );
}
