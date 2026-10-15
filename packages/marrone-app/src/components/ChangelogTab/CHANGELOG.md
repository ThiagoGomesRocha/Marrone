## What's New in Marrone v1.1.0

Esta versão traz acesso a banco de dados direto dos seus scripts e relatórios de execução
muito mais completos.

### Consultas de banco nos scripts

* **Cinco bancos suportados:** PostgreSQL, MySQL, SQL Server, Oracle e IBM DB2.
* Use `bru.db.connect`, `bru.db.query`, `bru.db.execute`, `bru.db.transaction` e
  `bru.db.disconnect` nos blocos de pré-requisição, pós-resposta e `tests` — no app e no CLI.
* As credenciais ficam no **cofre do sistema**, nunca no arquivo da coleção. A string de
  conexão do script leva apenas host, porta e database.
* A validação fica onde faz sentido: o bloco `tests` confirma **no banco** o que a requisição
  gravou.

### Relatórios mais completos

* Aba **Database Operations** no relatório HTML, também no relatório exportado pela interface.
* O relatório mostra o **SQL executado**, a conexão e o SGBD, o tempo, o status e as **linhas
  devolvidas** pela consulta (limitadas a 20 por operação, com o total real).
* Para gerar um relatório só com metadados, use `--reporter-hide-db-rows` no CLI.

### Correções

* O driver de SQL Server foi corrigido para devolver as linhas por nome de coluna, aceitar
  parâmetros com tipo explícito e preservar tabelas temporárias e transações entre chamadas.
* Os exemplos da aba **Settings > Database** passaram a mostrar a API real (`bru.db.*`).

---

Para a lista completa de mudanças, veja o [CHANGELOG](https://github.com/ThiagoGomesRocha/Marrone/blob/HEAD/CHANGELOG.md).
