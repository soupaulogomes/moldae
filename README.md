# Moldaê

Sistema com login e empresas isoladas, atualmente executado localmente, para precificação e gestão de impressão 3D. Next.js (React), backend Node.js via Route Handlers e PostgreSQL real. Paleta: verde #465039 e creme #FDF7EA.

## Abrir no computador atual

Execute ./iniciar.sh nesta pasta e abra http://127.0.0.1:3000. O script inicia o PostgreSQL local e o Next.js juntos. Se já estiverem rodando, use a aba aberta. Ctrl+C encerra os processos sem apagar os dados.

O banco fica em .local/postgres, na porta 55432. Senha aleatória em .local/config.json e conexão em .env, ambos privados e ignorados pelo Git. Fotos próprias ficam em .local/uploads. Não exclua .local ao atualizar o código.

## Instalar em outro computador

Requer Node.js 22 ou superior e pnpm. Dentro desta pasta:

~~~sh
pnpm install --frozen-lockfile
pnpm local
~~~

O iniciador instala o cluster na primeira execução e reaproveita os dados nas próximas. O pacote embedded-postgres fornece os binários; nenhum serviço global ou usuário do sistema é criado. O catálogo externo de fotos requer internet; fotos enviadas continuam disponíveis localmente.

Para PostgreSQL existente ou Docker, forneça ADMIN_DATABASE_URL ao script scripts/provision-security.mjs e depois execute pnpm dev. O provisionador cria a conexão restrita DATABASE_URL, migra o banco e gera o primeiro acesso. Nunca use uma conexão administrativa no processo web. compose.yaml disponibiliza apenas o banco alternativo; defina POSTGRES_PASSWORD e use a porta 5432 nessa conexão. Não misture esta alternativa com o iniciador local, que usa seu próprio cluster na porta 55432.

## Uso

1. Estoque: cadastre variantes por marca, tipo, cor, foto, código, fornecedor e localização. O catálogo inicial contém 44 referências das seis marcas informadas, sem saldo nem preços de compra. Consulte FONTES-IMAGENS.md.
2. Registre cada compra com quantidade na unidade do cadastro e custo total, incluindo frete. O saldo e o custo médio são atualizados e o pagamento entra no caixa.
3. Cadastre impressoras e ferramentas. Marque o pagamento apenas quando quiser lançar a aquisição no caixa.
4. Faça o orçamento em cinco etapas: Projeto, Material, Impressão, Custos e Taxas. As informações permanecem ao trocar de etapa. Nome do projeto é necessário para salvar. Abrir um orçamento salvo cria uma cópia para preservar os valores históricos.
5. O resumo exibe desconto, custo e lucro unitários, margem sobre a venda, estimativa de recuperação da máquina, estratégias de acréscimo e gráfico de custos. O PDF é gerado pela função de impressão do navegador e contém o resumo interno de custos.
6. Envie à produção. Ao finalizar, confirme consumo, tempo, trabalho e extras reais. Falhas baixam estoque e entram nas perdas. Não há baixa duplicada.
7. Venda um lote concluído e registre seu recebimento. Uma produção admite uma venda. O custo usado é o real registrado, sem a reserva hipotética do orçamento.
8. Financeiro: registre despesas, investimentos, aportes e retiradas. Despesas já incluídas nos custos da peça devem afetar apenas o caixa. Marque impacto no resultado somente para despesas adicionais, evitando duplicidade.

## Cálculos

- Filamento: preço/kg ÷ 1.000 × gramas do lote.
- Energia: potência em W × horas ÷ 1.000 × tarifa por kWh.
- Amortização: valor da impressora ÷ vida útil em horas × horas do lote.
- Trabalho: minutos manuais ÷ 60 × valor/hora.
- Extras: total informado de embalagem, acessórios, consumíveis e outros custos do lote.
- Reserva de falhas: percentual adicional sobre a soma dos custos, não probabilidade estatística.
- Preço sem taxas: custo com reserva × (1 + acréscimo/100).
- Preço com taxas: (custo com acréscimo + taxa fixa do lote) ÷ (1 − comissão/100 − imposto/100).
- Desconto: percentual sobre o preço sugerido, ou valor fixo sobre o lote. As taxas percentuais e o lucro são recalculados após o desconto.
- Margem: lucro ÷ preço final. Acréscimo sobre custo e margem sobre receita são conceitos diferentes.
- Recuperação da impressora: valor da máquina ÷ lucro previsto por peça, arredondado para cima. É apenas estimativa; não prevê vendas, prazo ou despesas gerais.

O resultado gerencial considera vendas na data da venda, custos dos lotes vendidos, taxas, perdas registradas e despesas adicionais marcadas. O caixa usa as datas efetivas de pagamento. Estoque e equipamentos mostram valores atuais, mesmo com filtro de período. Valores de energia e trabalho continuam estimados pelas tarifas, mesmo quando o tempo real é informado.

## Backup e restauração

Com o banco em execução, pnpm backup gera uma pasta em .local/backups com records.json e as fotos próprias. Copie a pasta de backup para outro local seguro. Exportar registros na interface gera somente o JSON da empresa autenticada, sem contas e sem fotos; não é um backup administrativo restaurável. O backup administrativo versão 2 inclui todas as empresas e hashes de senha: mantenha-o protegido. Sessões e links de acesso não são restaurados. Para restaurar em um banco vazio já migrado: pnpm restore /caminho/records.json. A restauração recusa bancos com registros, sem sobrescrevê-los. Fotos externas permanecem como links.

## Verificação

~~~sh
pnpm test
pnpm build
~~~

A suíte usa PGlite para PostgreSQL em memória. Para executar o mesmo fluxo contra PostgreSQL real, com banco temporário isolado:

~~~sh
TEST_REAL_POSTGRES=1 node --test tests/integration.test.mjs tests/security.test.mjs
~~~

Os testes reais leem a credencial administrativa de .local/admin.env (ou ADMIN_DATABASE_URL) para criar e excluir o banco temporário; as operações da aplicação executam com o papel restrito. O cluster local já permite isso. Os testes não inserem dados na base da empresa. O build de produção usa .next-production, separado da prévia em desenvolvimento.

## Escopo atual

Base para várias empresas, com login e isolamento no PostgreSQL, ainda vinculada a 127.0.0.1. Não foi publicada na internet. Produção usa um filamento principal por lote; acessórios entram nos extras e suas saídas podem ser registradas no estoque. Vendas são do lote completo e recebimentos integrais. O saldo é controlado por variante, não por carretel individual. Ainda não inclui conciliação bancária, emissão fiscal, estorno de vendas, parcelamento, reserva de estoque ou integração automática com marketplaces. O relatório financeiro é gerencial.

## Manutenção e depreciação

A aba Manutenção mostra depreciação linear pelo total de horas da impressora, limitada ao valor de aquisição. Horas de produções concluídas e falhas são somadas automaticamente quando a produção está vinculada a uma impressora. Horas anteriores ou externas podem ser adicionadas com motivo e histórico. A análise não duplica a amortização no financeiro e não é uma avaliação do valor de revenda.

Tarefas admitem intervalo em horas, dias ou ambos (vence pelo primeiro limite). A antecedência é configurável. Modelos de nomes ajudam a cadastrar limpeza da placa, inspeção/troca do bico, lubrificação, correias e ventiladores; nenhum intervalo técnico é presumido. Configure conforme o fabricante e as condições de uso.

Registrar a realização grava data, horímetro, custo e observações, e avança a referência somente dessa tarefa. Não zera horas nem depreciação da máquina. A opção de lançar o pagamento é explícita; impacto no resultado só deve ser marcado quando o custo não estiver incluído nas peças. Tarefas podem ser editadas e pausadas.

Os avisos são internos ao sistema (aba, menu e visão geral). Não há e-mail, notificação do sistema operacional ou processo de monitoramento com a aplicação fechada. Backups e restauração incluem tarefas, histórico de manutenção e horas manuais.

O saldo inicial pode ser registrado sem custo informado. Materiais assim ficam com custo pendente e fora da valorização conhecida do estoque. Use **Informar custo** para valorizar esse saldo, sem novo pagamento no caixa. Até informar o custo, o sistema impede compras adicionais, saídas e conclusão de produção desse material para evitar custos e resultados incorretos.

## Investimento e retorno
O Financeiro inclui uma visão acumulada independente do filtro de período. O valor aplicado soma aquisições de equipamentos (uma vez por cadastro), movimentos de saldo inicial valorizados, compras de estoque e investimentos avulsos. Aportes financiam o negócio e não entram novamente nesse total. O saldo de recuperação compara recebimentos de vendas com todas as saídas registradas, mais aquisições iniciais sem pagamento vinculado. Não representa saldo bancário nem prejuízo contábil. A meta por lucro é uma comparação gerencial separada, e não fluxo de caixa. Pagamentos ausentes e custos pendentes tornam os indicadores incompletos. Não lance avulsamente uma aquisição já cadastrada como equipamento; use a opção de pagamento no cadastro.

## Contas, empresas e planos

Abra o link de .local/primeiro-acesso.txt para criar sua conta; o token vale por 24 horas e só pode ser usado uma vez. Não compartilhe esse arquivo. Não há senha padrão nem cadastro público. Para renovar um link ainda não utilizado, execute pnpm security:setup.

A aba Conta e acesso permite alterar senha, convidar pessoas, revogar convites, remover acessos e trocar de empresa quando houver mais de uma associação. Colaborador tem leitura de todos os dados, incluindo financeiro; proprietário pode gravar e administrar usuários. Convites são enviados manualmente e expiram em 48 horas.

Administração da plataforma, somente no computador/servidor:

~~~sh
pnpm platform list
pnpm platform create-company "Empresa exemplo" proprietario@example.com
pnpm platform reset-password proprietario@example.com
pnpm platform plan UUID_DA_EMPRESA pilot active
~~~

Os comandos de criação/recuperação geram um arquivo privado com link de uso único (1 hora), sem enviar e-mail. Planos: pilot, basic, pro. Status: active, read_only, suspended. Sem checkout, cobrança, cotas ou integração de pagamentos nesta etapa. Veja SECURITY.md para as fronteiras atuais e preparo para publicação.
