# Segurança e evolução para serviço por assinatura

Implementado: conta com senha scrypt (salt individual, N=32768, r=8, p=1), sessão opaca aleatória de 256 bits (somente hash no banco), HttpOnly/SameSite=Lax, validade absoluta de 7 dias e inatividade de 12 horas. Secure é habilitado quando APP_ORIGIN usa HTTPS. Há verificação de Origin nas mutações, limites de tamanho de requisições e limite de tentativas persistente no banco. Links de primeiro acesso, convite e recuperação são aleatórios, expiram e têm uso único. Trocar/redefinir senha revoga sessões anteriores. E-mail não é enviado automaticamente.

Todas as operações de negócio exigem sessão. A empresa vem da sessão validada, não de parâmetros enviados pelo cliente. O PostgreSQL aplica RLS com FORCE e chaves estrangeiras compostas para impedir vínculos entre empresas. A conexão web não possui SUPERUSER/BYPASSRLS/DDL. Cada transação define app.tenant_id localmente, evitando vazamento pelo pool. Tabelas de identidade são globais; suas consultas ficam restritas ao código de autenticação, sem endpoint genérico de SQL. Isso não substitui prevenção de injeção SQL e revisão do código.

Uploads têm registro de propriedade por empresa, validação de formato e limite de 5 MB. Os arquivos não são servidos estaticamente e cada leitura valida a sessão e a propriedade. Não há varredura antimalware nem transformação de imagens ainda. A exportação da interface inclui somente dados da empresa. Backup administrativo inclui todas as empresas, usuários e hashes de senha, e deve ficar acessível somente à operação. Credenciais administrativas em .local/admin.env nunca são passadas ao processo Next.js. .local e .env não podem ser publicados.

Proprietário: leitura, escrita e acesso à administração da própria empresa. Colaborador: leitura, inclusive financeiro, sem gravação. Não há permissões por módulo nesta versão. Ativações de empresas, planos e recuperação de conta ficam em ferramenta local de plataforma. O status read_only impede mutações; suspended impede acesso aos dados. Revogação é verificada a cada requisição; dados já baixados por uma pessoa não podem ser recolhidos retroativamente.

## Antes de publicar ou cobrar

Definir domínio HTTPS e APP_ORIGIN exato, executar build/start (não servidor dev), separar o processo web da operação administrativa e das cópias de backup, configurar limites de tráfego no proxy, monitoramento e alertas, distribuição segura dos links de conta, backups externos criptografados com rotina de restauração e revisão de segurança independente. O limitador atual protege por conta e por janela global; uma implantação pública precisa proteção adicional de abuso na borda. Ainda não há MFA, confirmação automática de e-mail, recuperação por e-mail, gestão de consentimento, cobrança ou compromissos comerciais de disponibilidade. CSP bloqueia frames/objetos e origens de scripts externas, mas ainda permite scripts inline usados pelo Next.js; migrar para nonce antes de publicação.

## Integrações futuras

A tabela integration_connections já é vinculada à empresa com RLS. Não existem credenciais de integração armazenadas ou provedores ativados. Antes de implementar cada marketplace/e-commerce/Correios: adicionar OAuth com state vinculado à sessão e PKCE quando suportado; cofre de segredos com criptografia e rotação de chaves fora do banco; escopos mínimos por provedor; assinatura e proteção contra replay em webhooks; deduplicação/idempotência por empresa; fila de tarefas com empresa explícita, retries limitados e auditoria; limites por plano e segregação de ambientes. Nunca confiar em tenant_id do payload externo para selecionar a empresa. O usuário deve autorizar explicitamente cada conexão e ação externa.

## Validação

Testes em PGlite e PostgreSQL real cobrem isolamento de leitura/escrita, chaves estrangeiras entre empresas, consultas sem contexto, papéis, sessões, CSRF, convites e links de recuperação, expiração, rate limit e arquivos. Não equivalem a uma auditoria independente nem garantem ausência de vulnerabilidades. A interface foi verificada em ambiente separado; dados de teste não são usados na empresa Moldaê.

Acompanhar os avisos oficiais e manter dependências corrigidas: https://nextjs.org/blog e https://github.com/react/react/security/advisories .

Troca de e-mail exige sessão e senha atual; revoga outras sessões e links antigos. Ainda não confirma posse da nova caixa postal por e-mail. A conta inicial da Moldaê foi criada administrativamente com a senha explicitamente escolhida pelo proprietário; o fluxo de alteração de senha continua exigindo pelo menos 12 caracteres.

Entrada: / verifica a sessão no servidor e abre a visão geral, ou redireciona para /login. /login também verifica a sessão e redireciona usuários autenticados para /. Páginas de entrada e APIs não são armazenadas em cache HTTP. O navegador persiste somente o identificador opaco da sessão em cookie HttpOnly; nenhuma senha ou cópia dos dados é gravada em localStorage/sessionStorage. Ao voltar a uma página preservada pelo navegador (bfcache), a área autenticada recarrega e revalida a sessão. Ao retomar uma aba, a sessão e a empresa são verificadas novamente. Os prazos de 12 horas de inatividade e 7 dias absolutos permanecem.
