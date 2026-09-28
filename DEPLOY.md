# Publicação da Moldaê — preparação

Estado: uso local funcionando; nenhum serviço de hospedagem provisionado e nenhum dado enviado ao GitHub/nuvem por esta preparação.

## Repositório

Enviar somente os arquivos versionados desta pasta de código. .env, .local, PostgreSQL local, fotos, backups e tokens não fazem parte do Git. Manter esses arquivos fora de qualquer upload manual. GitHub não é backup do banco.

## Destino planejado

- Código no repositório público https://github.com/soupaulogomes/moldae. Somente código: nunca dados, fotos privadas, backups ou credenciais.
- Next.js no Netlify Free, sujeito aos limites do plano.
- PostgreSQL no Supabase Free e imagens em Storage privado.
- Conta de banco restrita moldae_app; nenhuma credencial administrativa no runtime web.
- Fotos em armazenamento privado, mantendo autorização por empresa antes de servir cada arquivo.

## Pendências reais antes do primeiro deploy

1. Confirmar conta/repositório, provedor, região, orçamento e domínio. Não provisionar serviços pagos sem autorização.
2. Adaptar o armazenamento de uploads: hoje /api/images grava em .local/uploads. O filesystem de funções não substitui armazenamento persistente. Migrar arquivos e metadados com verificação de propriedade por empresa.
3. Adaptar e validar as migrações/provisionamento no banco gerenciado selecionado. O script atual foi testado no PostgreSQL local; permissões administrativas variam entre provedores. Manter FORCE RLS, chaves estrangeiras compostas e papel de aplicação sem bypass.
4. Se usar Supabase: desabilitar a Data API para tabelas internas ou retirar todas as concessões de anon/authenticated e usar schema não exposto. Contas, sessões e tokens usam autenticação própria da aplicação e não devem ficar acessíveis pela API pública do provedor. Não usar service_role ou credenciais administrativas no navegador.
5. Configurar conexão com pool compatível com transações e TLS com validação de certificado. Nunca desativar validação TLS para contornar erros. Usar conexão administrativa separada somente na migração.
6. Ajustar o diretório de build para o padrão .next no Netlify; o desenvolvimento local usa .next e os builds locais usam .next-production. Excluir .local de qualquer tracing/bundle. A instalação de embedded-postgres só atende uso/testes locais.
7. Configurar DATABASE_URL restrita e APP_ORIGIN com o domínio HTTPS exato no Netlify. Não usar NEXT_PUBLIC_ em segredos. APP_ORIGIN ativa Secure nos cookies e a verificação exata de origem.
8. Criar ambiente de homologação isolado da produção. Previews de branches não devem apontar para os dados reais da Moldaê.
9. Revisar o acesso inicial antes de expor à internet: substituir a senha simples escolhida para uso local e invalidar sessões/links locais após migração. Não migrar sessões nem tokens de recuperação.
10. Executar migração e restauração do backup administrativo em ambiente controlado; conferir os registros e a autorização de arquivos. Dados locais continuam preservados até validar o destino. Evitar lançamento simultâneo em dois bancos divergentes durante o corte.
11. Testar login, isolamento de empresas, orçamento, produção, vendas, financeiro, uploads, restauração e limites da hospedagem. Configurar backups externos, proteção de abuso e monitoramento antes de operar como serviço público.

## Planos e validação

Usar somente planos gratuitos. Reconferir limites e termos no provisionamento. Nenhum serviço pago está autorizado. Publicar o código no GitHub não publica a aplicação nem migra o banco; as pendências acima precisam ser resolvidas antes do uso na nuvem.
