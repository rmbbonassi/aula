# Design: Página de Cadastro /register

## Objetivo
Permitir que novos usuários criem conta no CRM com confirmação por e-mail antes do primeiro acesso.

## Fluxo

```
/register
  └── Formulário: nome, e-mail, senha, confirmar senha
        └── Submit → supabase.auth.signUp()
              ├── Sucesso → exibe mensagem "Verifique seu e-mail para ativar a conta"
              └── Erro → exibe mensagem de erro inline

E-mail de confirmação (Supabase)
  └── Link → redireciona para Site URL (/login)
```

## Formulário

Campos em ordem:
1. **Nome completo** — obrigatório, mínimo 2 caracteres
2. **E-mail** — obrigatório
3. **Senha** — obrigatório, mínimo 6 caracteres
4. **Confirmar senha** — deve ser igual à senha

Erros: inline, `<p role="alert" className="text-sm text-red-500">`, mesmo padrão do `/login`.

Após sucesso: substitui o formulário por mensagem estática com o e-mail digitado.

## Integração Supabase

```ts
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: nome } }
})
```

Nome salvo em `user_metadata` — sem tabela extra.

## Configuração Supabase (manual, uma vez)

- Authentication → URL Configuration → **Site URL**: `https://SEU_DOMINIO`

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/app/register/page.tsx` | Criar |
| `src/app/login/page.tsx` | Adicionar link "Criar conta" → `/register` |
