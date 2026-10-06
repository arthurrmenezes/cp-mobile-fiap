# Chat App — React Native + Firebase

Aplicativo de chat individual e em grupo, com autenticação por e-mail/senha, mensagens em tempo real e notificações push.

## Tecnologias

- React Native + Expo SDK 55 (TypeScript)
- React Navigation (navegação em pilha)
- Firebase Authentication (e-mail/senha)
- Cloud Firestore (perfis, grupos, tokens de notificação)
- Firebase Realtime Database (mensagens)
- Cloudflare R2 + Cloudflare Workers (armazenamento das fotos de perfil e de grupo)
- Firebase Cloud Messaging + Expo Notifications (push)
- API própria em C# / .NET 10 (ASP.NET Core Minimal API), publicada via Docker (envio seguro das notificações)

## Responsabilidade de cada serviço Firebase

- **Authentication**: cadastro, login, logout e sessão do usuário.
- **Firestore**: perfis (`users`), grupos (`groups`), conversas individuais (`directConversations`) e tokens de dispositivo (`users/{uid}/devices`).
- **Realtime Database**: mensagens de todas as conversas, com listeners em tempo real.
- **Cloud Messaging**: entrega das notificações push, disparadas pela API.

> **Por que não o Firebase Storage:** o Storage exige o plano Blaze (pay-as-you-go, com cota gratuita, mas exige cartão de crédito cadastrado na conta do Google Cloud). O enunciado permite explicitamente usar outro serviço de armazenamento ("Firebase Storage é recomendado, mas outra solução poderá ser utilizada"), então optamos por manter o Firebase só no plano Spark (gratuito, sem cartão).
>
> **Por que Cloudflare R2:** a equipe já tinha conta Cloudflare configurada e experiência prévia com R2 + Workers em outro projeto pessoal/acadêmico, então reaproveitamos esse conhecimento em vez de criar uma conta nova em outro serviço. O R2 tem cota gratuita generosa (10 GB de armazenamento e, diferente da maioria dos provedores, **saída de rede gratuita**) e não exige cartão de crédito para o plano free.
>
> Um Cloudflare Worker (`photos-worker/`) expõe dois endpoints simples: `POST /upload` (recebe a foto, valida o Firebase ID Token do usuário, salva no bucket R2) e `GET /p/:chave` (serve a foto publicamente). Apenas a URL retornada é salva no Firestore — a imagem em si nunca passa pelo Firestore.

Os dois bancos foram usados porque o Firestore é melhor para dados estruturados com consultas (perfis, grupos) e o Realtime Database é mais simples para a sincronização contínua das mensagens. Validações que dependem dos dois bancos juntos (ex: confirmar remetente + política de notificação do grupo) ficam na API, pois as regras de cada banco não têm acesso ao outro.

## Estrutura do projeto

```
app/            → aplicativo mobile (Expo + TypeScript)
server/         → API de notificações (C# / .NET 10, ASP.NET Core Minimal API)
photos-worker/  → Cloudflare Worker que recebe e serve as fotos (R2)
```

## Rodando o app

```bash
cd app
npm install
npx expo start
```

Preencha o arquivo `app/firebaseConfig.json` com os dados do seu projeto Firebase (Configurações do projeto → Seus apps → SDK config).

Como o projeto usa módulos nativos (notificações, imagens), é necessário um **development build**:

```bash
npx expo run:android
# ou
npx expo run:ios
```

O Expo Go não é suficiente para testar o push completo.

### Variáveis de ambiente do app

Copie `app/.env.example` para `app/.env` e configure:

```
EXPO_PUBLIC_NOTIFICATIONS_API_URL=https://sua-api.exemplo.com
EXPO_PUBLIC_PHOTOS_API_URL=https://chat-fiap-fotos.roteiro-fotos.workers.dev
```

A URL de `EXPO_PUBLIC_PHOTOS_API_URL` é a do Cloudflare Worker (ver seção "Fotos de perfil e grupo" abaixo).

## Configuração de notificações

### Android

- Necessário um development build (`expo run:android`) ou build via EAS.
- O `app.json` já inclui o plugin `expo-notifications`.

### iOS

- Necessário dispositivo físico (push não funciona em simulador).
- Necessário Apple Developer Account configurado no EAS para gerar as credenciais de push (APNs).

## Rodando a API de notificações

A API é um projeto ASP.NET Core Minimal API (.NET 10). As variáveis de ambiente usam o separador `__` (padrão do ASP.NET Core) em vez do formato `.env` tradicional — ver `server/.env.example`.

Rodando localmente:

```bash
cd server
export FIREBASE__PROJECTID=...
export FIREBASE__CLIENTEMAIL=...
export FIREBASE__PRIVATEKEY=...   # com \n literais, não quebras de linha reais
export FIREBASE__DATABASEURL=https://chat-firebase-fiap-default-rtdb.firebaseio.com
dotnet run
```

Ou via Docker (mesma imagem usada no deploy):

```bash
cd server
docker build -t notifications-api .
docker run -p 8080:8080 --env-file .env.docker notifications-api
```

### Endpoints

- `GET /health` — healthcheck, retorna `{ "status": "ok" }`.
- `POST /notifications/messages` — recebe `conversationId` e `messageId`, valida o token do Firebase no header `Authorization: Bearer <token>`, confere o remetente da mensagem e dispara o push para os destinatários corretos.

### Deploy no Render (Docker)

1. Crie um "Web Service" no Render apontando para este repositório
2. Runtime: **Docker**
3. Root directory: `server`
4. O Render detecta e usa o `server/Dockerfile` automaticamente (não precisa de build/start command)
5. Configure as variáveis de ambiente (aba "Environment"): `FIREBASE__PROJECTID`, `FIREBASE__CLIENTEMAIL`, `FIREBASE__PRIVATEKEY`, `FIREBASE__DATABASEURL`
6. Deploy

### URL pública da API

> Preencher após o deploy:
> `https://SUA-URL-AQUI.onrender.com`

Para verificar que a API está no ar, acesse `GET /health`.

## Política de notificações

Cada grupo tem uma `notificationPolicy`, configurável pelo proprietário:

- `all_group_messages`: todos os integrantes (exceto o remetente) recebem notificação de qualquer mensagem geral do grupo.
- `mentioned_members`: só quem foi mencionado ou selecionado como destinatário da mensagem recebe notificação.
- `direct_messages_only`: mensagens do grupo não geram push; só conversas individuais notificam.
- `disabled`: nenhuma mensagem do grupo gera push.

Em conversas individuais, o outro participante é notificado sempre (exceto se ele mesmo enviou a mensagem).

A API calcula os destinatários no servidor, nunca confia em uma lista enviada pelo app.

## Proteção contra concorrência no limite de grupo

A entrada de um novo integrante no grupo usa uma **transação do Firestore** (`runTransaction` em `app/src/services/groupService.ts`). O server usa a mesma técnica (`RunTransactionAsync`) para evitar notificação duplicada quando `/notifications/messages` é chamado mais de uma vez para a mesma mensagem. A transação lê a quantidade atual de integrantes e só adiciona o novo membro se ainda houver vaga, de forma atômica — mesmo que duas pessoas tentem entrar no grupo ao mesmo tempo, apenas uma conseguirá se só restar uma vaga.

A interface também valida o limite antes de permitir a ação, mas a garantia real está na transação.

## Regras de segurança

- `app/firestore.rules` — regras do Cloud Firestore.
- `app/database.rules.json` — regras do Realtime Database.

Resumo:

- Somente usuários autenticados acessam dados protegidos.
- Um usuário só edita o próprio perfil e os próprios tokens de dispositivo.
- Só o proprietário ou os integrantes do grupo podem ler/atualizar o grupo.
- Mensagens exigem autenticação e o `senderId` deve ser o usuário autenticado.

## Fotos de perfil e grupo

As fotos são selecionadas pela galeria do dispositivo (`expo-image-picker`) e enviadas para um **Cloudflare Worker** (`photos-worker/`), que:

1. Confere o Firebase ID Token do usuário (sem precisar do Admin SDK — o Worker valida a assinatura do JWT direto com as chaves públicas do Google).
2. Salva o arquivo num bucket **R2** (`chat-fiap-fotos`), com uma chave aleatória por foto.
3. Devolve a URL pública da foto (servida pelo próprio Worker em `/p/<chave>`).

Apenas essa URL é salva no Firestore — a imagem em si nunca é salva em Base64 nem passa pelo banco de dados.

### Rodando/publicando o `photos-worker`

```bash
cd photos-worker
npm install
npx wrangler login          # autentica com sua conta Cloudflare
npx wrangler r2 bucket create chat-fiap-fotos   # só na primeira vez
npx wrangler deploy
```

O deploy mostra a URL pública do Worker (formato `https://chat-fiap-fotos.<sua-conta>.workers.dev`). Essa URL é a que vai em `EXPO_PUBLIC_PHOTOS_API_URL`.

Não há segredos neste Worker — `FIREBASE_PROJECT_ID` e `ALLOWED_ORIGINS` são variáveis públicas, configuradas em `wrangler.toml`.

## Telas

- Login / Cadastro
- Conversas (lista de diretas e grupos)
- Usuários (busca e seleção para iniciar conversa ou montar grupo)
- Criação de grupo
- Chat (mensagens em tempo real)
- Perfil
- Integrantes do grupo

## Pendências para configurar antes da entrega

- [x] Preencher `app/firebaseConfig.json` com os dados reais do projeto Firebase
- [x] Criar o projeto no Firebase (Authentication por e-mail/senha, Firestore, Realtime Database, Cloud Messaging)
- [ ] Publicar as regras (`firestore.rules` e `database.rules.json`) no console do Firebase
- [x] Gerar a chave de conta de serviço (configurada localmente em `server/.env` para testes; configurar na hospedagem antes do deploy)
- [x] Criar o bucket R2 e publicar o `photos-worker` (já no ar em `https://chat-fiap-fotos.roteiro-fotos.workers.dev`)
- [ ] Revogar a chave de conta de serviço antiga (foi exposta sem querer num terminal durante a configuração) e gerar uma nova antes do deploy final
- [ ] Fazer o deploy da API (`server/`, Docker) no Render (ou outro serviço com suporte a Docker) e colar a URL final neste README
- [ ] Configurar `EXPO_PUBLIC_NOTIFICATIONS_API_URL` no app apontando para a API publicada
- [ ] Gerar um development build para testar push em dispositivo físico (Android e iOS)
- [ ] Tirar prints das telas e adicionar neste README
- [ ] Gravar/printar uma evidência de notificação recebida no dispositivo

## Prints das telas

> Adicionar aqui.

## Evidência de notificação recebida

> Adicionar aqui.

## Integrantes

- RM562950 — Arthur Menezes
- RM93645 — Caio Rasuck
