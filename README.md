# Portal Regional Jaraguá — GitHub Pages + Supabase

Este pacote fornece uma base de login com visual escuro/preto, vermelho e dourado inspirado no HTML original, sessão persistente, perfis `admin`/`member`, conteúdo interno carregado do banco e criação administrativa de contas via Supabase Edge Function.

## Limite importante do GitHub Pages

GitHub Pages hospeda arquivos estáticos. Qualquer informação incluída no HTML, JavaScript, imagens ou histórico Git público pode ser baixada sem login. Por isso, este projeto **não coloca os comunicados ou contatos internos diretamente no HTML**: eles devem ficar em `public.portal_content` com RLS e ser servidos apenas após autenticação. Não publique o HTML original com dados confidenciais nem mantenha fotos/documentos restritos em URLs públicas do repositório. Para arquivos privados, use Supabase Storage com bucket privado e políticas de acesso.

O código é uma base de implementação e requer configuração do projeto Supabase antes de funcionar. O plano gratuito pode ter limites e regras de uso que mudam com o tempo.

## 1. Criar o projeto Supabase

O projeto já está criado. As configurações fornecidas foram inseridas em `index.html`:

- **Project URL:** `https://blauxdsdfpxlobtlbuis.supabase.co`
- **Project ref:** `blauxdsdfpxlobtlbuis`
- **Chave do navegador:** a publishable key fornecida, com prefixo `sb_publishable_`

1. No projeto Supabase `reg jaragua`, abra **SQL Editor** e execute o arquivo `supabase/schema.sql` inteiro.
2. A chave publishable fica no HTML, o que é esperado para um site estático; a proteção real depende de Auth, RLS e permissões mínimas. **Nunca** coloque uma secret key, senha do banco ou token administrativo no HTML/GitHub.
3. A string PostgreSQL fornecida contém `[YOUR-PASSWORD]`, ou seja, não é uma credencial completa. Ela não é necessária para conectar o HTML ao Supabase e não deve ser colocada no frontend. Use conexão direta apenas em ferramenta/ambiente confiável e substitua o marcador pela senha do banco localmente, sem publicar essa senha.

## 2. Criar o primeiro administrador

1. No painel Supabase, vá a **Authentication → Users → Add user** e crie uma conta com e-mail e senha forte.
2. Copie o UUID desse usuário.
3. No SQL Editor, execute (substituindo o UUID):

```sql
insert into public.member_profiles (id, display_name, role, is_active)
values ('UUID_DO_USUARIO_ADMIN', 'Administrador Regional', 'admin', true)
on conflict (id) do update set role='admin', is_active=true;
```

4. Entre no portal com essa conta. A área **Administração de acessos** aparecerá apenas para administradores ativos.

## 3. Publicar a função de criação de usuários

A criação de contas não pode usar a chave secreta no browser. Ela ocorre na Edge Function `admin-create-user`, que verifica a sessão do solicitante e consulta seu perfil antes de criar cada usuário.

Com Supabase CLI instalado e autenticado:

```bash
supabase login
supabase link --project-ref blauxdsdfpxlobtlbuis
supabase functions deploy admin-create-user
```

A função utiliza variáveis fornecidas pelo Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) e precisa de `SUPABASE_SERVICE_ROLE_KEY` como secret. Configure o secret no painel/CLI de acordo com a versão do seu projeto:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SECRETA
```

Use o nome de chave compatível exibido no painel do seu projeto. Se o projeto usar secret keys novas em vez da `service_role` legada, adapte a variável e a inicialização do cliente para a chave administrativa correspondente. Essa chave deve existir somente nos secrets da Edge Function.

## 4. Configurar Auth

Em **Authentication → URL Configuration**, configure `https://jefferson-ciber.github.io/reg-jaragua/` como Site URL e inclua essa mesma URL em Redirect URLs quando necessário. Para este fluxo de e-mail/senha não há cadastro público nem redirect de convite.

Recomendação: desative signups públicos em Authentication se o painel do seu projeto permitir; a criação de usuários deve acontecer somente pela Edge Function/painel administrativo. A função cria a conta com e-mail confirmado para dispensar o fluxo de confirmação no cenário de contas criadas pelo administrador. Use e-mails que você está autorizado a cadastrar.

## 5. Publicar no GitHub Pages

Repositório: https://github.com/Jefferson-ciber/reg-jaragua

1. Coloque os arquivos do projeto na raiz do repositório (o `index.html` precisa estar na raiz).
2. No GitHub, abra **Settings → Pages** e configure a publicação a partir da branch principal e da pasta `/ (root)`.
3. Publique e teste em uma janela anônima: sem sessão deve aparecer apenas a tela de login; um usuário inexistente não pode ler `portal_content` pela API.
4. Teste com uma conta `member` e uma conta `admin`.
5. Teste a desativação de usuário alterando `is_active=false`; em novo carregamento, o portal deve negar o acesso e o RLS bloquear conteúdo.

## 6. Inserir conteúdo interno

Adicione comunicados aprovados pela área administrativa ou via SQL Editor, por exemplo:

```sql
insert into public.portal_content (category, title, body, sort_order, is_published)
values ('Orientação', 'Uso dos canais oficiais', 'Insira aqui o texto autorizado para os integrantes.', 10, true);
```

A versão inicial inclui a tela de login e a leitura segura de conteúdo, mas não inclui editor de comunicados no navegador. O conteúdo deve ser cadastrado no SQL Editor até que se implemente o módulo administrativo de conteúdo.

## 7. Checklist de segurança antes de divulgar

- [ ] Não publicar o HTML antigo com informações privadas no repositório.
- [ ] Não colocar chaves secretas em HTML, JavaScript, issues ou commits.
- [ ] Conferir que as tabelas têm RLS ativo e grants mínimos.
- [ ] Confirmar que apenas o primeiro administrador foi promovido manualmente.
- [ ] Testar usuário desativado e usuário sem perfil.
- [ ] Não colocar documentos confidenciais em links públicos do GitHub Pages.
- [ ] Não reutilizar senhas; entregar senha temporária em canal privado e planejar fluxo de troca no primeiro acesso.
- [ ] Guardar os contatos pessoais somente em área com autorização adequada.

## Arquivos

- `index.html`: interface do portal e login.
- `supabase/schema.sql`: tabelas, funções auxiliares e políticas RLS.
- `supabase/functions/admin-create-user/index.ts`: função segura de criação de usuário.


## Comandos para este repositório

Execute no terminal, dentro da pasta do projeto, com Git e Supabase CLI instalados:

```bash
git clone https://github.com/Jefferson-ciber/reg-jaragua.git
cd reg-jaragua
supabase login
supabase init
supabase link --project-ref blauxdsdfpxlobtlbuis
supabase functions deploy admin-create-user
```

Se o repositório já estiver clonado e já tiver uma pasta `supabase/`, não execute `supabase init` novamente sobre ela. A implantação da função também exige configurar no Supabase os secrets de backend indicados na seção 3. Não compartilhe a senha do PostgreSQL nem qualquer chave secreta.
