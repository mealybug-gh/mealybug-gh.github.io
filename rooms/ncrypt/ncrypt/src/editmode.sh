#!/bin/bash

FILE="${1}"
SYMBOL="${2}"

LINE1EDIT="module.exports = (function(ncrypt){"
LINE1MAKE="//${LINE1EDIT}"
LAST1EDIT="return ${SYMBOL}; });"
LAST1MAKE="//${LAST1EDIT}"

MODE=$(grep "${LINE1MAKE}" "${FILE}")

if [ -z "${MODE}" ];then
    sed -i "s#${LINE1EDIT}#${LINE1MAKE}#g" "${FILE}"
    sed -i "s#${LAST1EDIT}#${LAST1MAKE}#g" "${FILE}"
else
    sed -i "s#${LINE1MAKE}#${LINE1EDIT}#g" "${FILE}"
    sed -i "s#${LAST1MAKE}#${LAST1EDIT}#g" "${FILE}"
fi
