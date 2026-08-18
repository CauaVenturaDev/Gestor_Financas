/**
 * "Sem categoria" existe em duas formas no banco: `category_id` nulo, para o
 * lançamento que nasceu sem categoria, e a categoria de sistema por natureza,
 * que é o destino da reatribuição quando uma categoria é excluída (RN14).
 *
 * Na interface as duas viram a mesma coisa. Este sentinela representa esse
 * conjunto no filtro, já que ele não corresponde a um id de verdade.
 */
export const SEM_CATEGORIA = 'sem-categoria'
