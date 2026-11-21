#!/bin/bash
# Crea el esquema de producción (001_schema.sql) con el nombre de la BD de pruebas.
# El archivo original hace DROP/CREATE de "SistemaGestionProyectosSENA": aquí se
# cambia por "SistemaGestionProyectosSENA_test" para que nunca se mezclen.
set -e
sed 's/SistemaGestionProyectosSENA/SistemaGestionProyectosSENA_test/g' /schema/001_schema.sql \
  | mysql -uroot -p"$MYSQL_ROOT_PASSWORD"
