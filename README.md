# mevo-challenge

url do desafio: [https://github.com/brunolobo-mevo/](https://github.com/brunolobo-mevo/dGVzdGU6bWV2b2JhY2tlbmQ/blob/main/README.md)

## Validação dos dados - Decisões

Para validar os dados foi criado uma entidade chamada `PrescriptionEntity` que cuidará de dizer se os dados são válidos ou não !

## Validação dos dados - Checkpoint

- [x] Verificar se Prescricao tem duração maior que 0
- [x] Verificar se Prescricao NÃO CONTROLADA tem duração máxima de 90 dias
- [x] Verificar se Prescricao CONTROLADA tem duração máxima de 60 dias
- [x] Verificar se Prescricao CONTROLADA tem notas do médico
- [x] Verificar se Prescricao tem CÓDIGO DE UNIDADE FEDERATIVA válido
- [x] Verificar se Prescricao tem CPF de paciente válido

## Cenários

## Fluxo de arquivo com dados válidos

Para cenários de dados válidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background disponibilizando as informações conforme forem processadas !

## Fluxo de arquivo com dados inválidos

Para cenários de dados inválidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background cada erro de validação será disponibilizado e armazenado em outro driver de dados para permitir a consulta, permitindo o processamento do batch do arquivo !

## Fluxo de arquivo corrompido

Para cenários de arquivos corrompidos será necessário o processamento em batch será interrompido para que o usuário possa fazer o download novamente do arquivo !

<br/>

## Fluxo dos endpoints

### `POST - api/prescription/upload`

Para permitir o processamento assíncrono dos dados o processamento do arquivo será feito em background, para isso será usado a parte de streams do nodejs sendo que elas são não bloqueantes. Para evitar problemas com a memória será usado um processamento em batch, então o arquivo CSV poderá ser lido em partes e processado de forma adequada sem afetar a memória !

### `GET - api/prescription/upload/:id`

Endpoint para pegar os status do upload do arquivo !

<br/>