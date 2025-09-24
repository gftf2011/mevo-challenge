# mevo-challenge

url do desafio: [https://github.com/brunolobo-mevo/](https://github.com/brunolobo-mevo/dGVzdGU6bWV2b2JhY2tlbmQ/blob/main/README.md)

## Validação dos dados - Decisões

Para validar os dados foi criado uma entidade chamada `PrescriptionEntity` que cuidará de dizer se os dados são válidos ou não !

## Validação dos dados - Checkpoint

- [x] Verificar se Prescricao tem duração maior que 0
- [x] Verificar se Prescricao NÃO CONTROLADA tem duração máxima de 90 dias
- [x] Verificar se Prescricao CONTROLADA tem duração máxima de 60 dias
- [x] Verificar se Prescricao CONTROLADA tem notas do médico
- [] Verificar se Prescricao tem CÓDIGO DE UNIDADE FEDERATIVA válido
- [] Verificar se Prescricao tem CPF de paciente válido
