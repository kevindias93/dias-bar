# Dias Bar

App web de controle do bar: **venda avulsa (PDV), comandas de clientes, estoque, caixa (abre/fecha o dia), máquinas de cartão e contas bancárias**. Feito em **React + Vite** com **Firebase** (Firestore + Auth), então os dados sincronizam em tempo real entre o celular do balcão, outros aparelhos e o computador.

---

## 1. Criar o projeto no Firebase

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**. Dê o nome que quiser (ex: `dias-bar`).
2. Depois de criado, no menu lateral vá em **Criação → Firestore Database → Criar banco de dados**. Escolha o modo de **produção** e a região `southamerica-east1` (São Paulo).
3. Ainda no menu, vá em **Criação → Authentication → Começar** e ative o provedor **E-mail/senha**.
4. Crie o seu usuário: aba **Users → Adicionar usuário**, informe e-mail e senha. Esse será o login do app. Repita para cada pessoa que vai usar (você, funcionários).

## 2. Pegar as credenciais

1. No console, clique na engrenagem ⚙️ → **Configurações do projeto**.
2. Em **Seus apps**, clique no ícone **</>** (Web) e registre um app (ex: `dias-bar-web`).
3. O Firebase vai mostrar um objeto `firebaseConfig` com `apiKey`, `authDomain`, etc. Deixe essa tela aberta.

## 3. Configurar o projeto local

1. Renomeie o arquivo `.env.example` para `.env`.
2. Preencha cada valor com o que apareceu no `firebaseConfig`:

```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=...
VITE_FB_PROJECT_ID=...
VITE_FB_STORAGE_BUCKET=...
VITE_FB_MESSAGING_SENDER_ID=...
VITE_FB_APP_ID=...
```

## 4. Aplicar as regras de segurança

No console, em **Firestore Database → Regras**, cole o conteúdo do arquivo `firestore.rules` deste projeto e publique. Isso garante que só quem está logado acessa os dados.

## 5. Rodar

Precisa ter o [Node.js](https://nodejs.org) instalado (versão 18+).

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # abre em modo desenvolvimento (http://localhost:5173)
```

Na primeira execução o app cria alguns produtos de exemplo — pode editar ou apagar à vontade em **Estoque**.

## 6. Publicar (opcional)

Para usar de verdade no dia a dia, publique a versão de produção. O caminho mais simples é o **Firebase Hosting**:

```bash
npm run build                       # gera a pasta dist/
npm install -g firebase-tools       # só na primeira vez
firebase login
firebase init hosting               # escolha o projeto; use "dist" como pasta pública; app de página única: Sim
firebase deploy
```

No fim ele te dá um link `https://SEU-PROJETO.web.app` que abre em qualquer celular ou computador. Dá para "instalar" pela opção **Adicionar à tela inicial** do navegador.

---

## Como funciona

- **Vender** — venda rápida no balcão: toca nos produtos, revisa e recebe. Baixa o estoque na hora.
- **Comandas** — abre uma comanda com o nome do cliente/mesa e vai lançando o consumo. O estoque baixa a cada item. No fim, **Fechar conta** registra o pagamento.
- **Estoque** — cadastro de produtos (cervejas, salgados, porções, doces), preço, custo e quantidade. Botões +/− para repor.
- **Caixa** — abre o dia com o troco inicial, mostra o resumo ao vivo (por forma de pagamento, por máquina, por conta), permite estornar vendas e **fecha o dia** gerando o relatório. O histórico fica guardado.
- **Ajustes** — cadastro das **máquinas de cartão** e das **contas bancárias**. No pagamento em cartão você escolhe a máquina (crédito/débito); no Pix, a conta que recebeu. O fechamento discrimina tudo — ótimo para conferir com os extratos.

Pagamentos podem ser **divididos** (ex: parte em dinheiro, parte no cartão) na tela de recebimento.

## Estrutura

```
src/
  firebase.js            inicialização do Firebase
  App.jsx                rotas + login + semente inicial
  context/               AuthContext (login) e DataContext (dados + operações)
  components/            Layout, Login, Modais, PaymentModal, ProductPicker, Toast
  pages/                 Vender, Comandas, Estoque, Caixa, Ajustes
  lib/                   formatação e constantes
```
