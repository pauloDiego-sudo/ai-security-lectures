# Sécurité des IA — material de estudo

Aulas interativas e um QCM de revisão do curso **Sécurité des IA** (ENSICAEN, 2A S8), em React + TypeScript.

| Rota | Conteúdo |
|---|---|
| `/` | Índice dos módulos |
| `/aulas/02-fundamentos-ml` | Fundamentos de ML: neurônio, fronteira de decisão, gradiente descendente |
| `/aulas/03-ataques-evasao` | Ataques de evasão: FGSM, taxonomia, construtor de threat model |
| `/aulas/04-white-box` | White-box: normas Lp, FGSM, I-FGSM/PGD, DeepFool, C&W, UAP |
| `/aulas/05-black-box` | Black-box: transferência, diferenças finitas, boundary attack, Papernot |
| `/aulas/06-defesas` | Defesas: adversarial training, distillation, pré-processamento, feature squeezing |
| `/aulas/08-robustez-certificada` | Robustez certificada: Lipschitz, randomized smoothing, intervalos de confiança |
| `/aulas/09-privacidade` | Privacidade: randomised response, Laplace, privacidade diferencial |
| `/quiz` | QCM em francês, por capítulo |

> O conteúdo é derivado dos slides do curso do Prof. Frédéric Jurie. Antes de publicar o repositório, confirme que você tem permissão para isso.

## Rodando localmente

Requer Node 22+ (a versão usada no CI está em `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes (Vitest + jsdom)
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o dist/
```

## Estrutura

```
src/
├── App.tsx                  rotas
├── pages/                   Home, LessonPage (monta uma aula), NotFound
├── lessons/
│   ├── catalog.ts           lista de módulos (título, slug, import da aula)
│   ├── shared/              helpers de DOM/canvas, scroll spy, paleta, ciclo de vida
│   └── NN-slug/
│       ├── content.html     corpo da aula (texto, fórmulas, canvases)
│       ├── style.css        tema da aula, ativo só enquanto ela está aberta
│       └── interactive.ts   simulações em TypeScript
└── quiz/                    QCM: questões, validação, componente
```

Cada aula foi migrada de um HTML autocontido. O texto ficou em `content.html` sem alterações. Os handlers `onclick`/`oninput` viraram atributos `data-click`/`data-input`, que a `LessonPage` despacha para as ações tipadas de `interactive.ts`.

### Adicionar uma aula

1. Crie `src/lessons/NN-slug/` com `content.html`, `style.css`, `interactive.ts` (exportando `setup`) e o `index.ts` padrão (copie de outra aula).
2. Registre o módulo em `src/lessons/catalog.ts`.
3. `npm test`: o teste de fumaça falha se algum `data-click`/`data-input` não tiver ação, ou se o script referenciar um id que não existe no HTML.

## Publicando no GitHub Pages

1. Crie o repositório no GitHub e faça push da branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` testa, compila com `BASE_PATH=/<nome-do-repo>/` e publica. Ele também roda em pull requests, mas sem publicar.

O GitHub Pages é estático. Por isso o build copia o `index.html` para cada rota (`aulas/<slug>/index.html`, `quiz/index.html`), e os links diretos respondem 200. Qualquer outra URL cai no `404.html`, que mostra a página "não encontrada" do app.

## Privacidade

As fontes (Inter, DM Sans, Instrument Serif, JetBrains Mono, licença OFL) vêm do pacote `@fontsource` e são servidas pelo próprio site. Nenhuma requisição vai a terceiros, então o IP de quem visita não é repassado ao Google Fonts.
