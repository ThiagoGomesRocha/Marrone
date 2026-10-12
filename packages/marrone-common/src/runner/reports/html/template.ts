import type { T_RunnerRequestExecutionResult } from '../../types';

export const getFilteredRequestResults = (results: T_RunnerRequestExecutionResult[] = [], onlyFailed = false) => {
  const indexedResults = (Array.isArray(results) ? results : []).map((value, index) => ({ value, index }));

  if (!onlyFailed) {
    return indexedResults;
  }

  return indexedResults.filter(
    ({ value }) =>
      value?.status === 'error'
      || !!value?.testResults?.find((t) => t.status !== 'pass')
      || !!value?.assertionResults?.find((t) => t.status !== 'pass')
  );
};

export const htmlTemplateString = (resutsJsonString: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- Would use latest version, you'd better specify a version -->
    <script src="https://unpkg.com/naive-ui"></script>

    <title>Marrone</title>
    <style>
      .error > .status {
        color: red;
      }
      .success > .status {
        color: green;
      }

      .n-collapse-item.success > .n-collapse-item__header {
        background-color: rgba(237, 247, 242, 1);
      }
      .n-collapse-item.error > .n-collapse-item__header {
        background-color: rgba(251, 238, 241, 1);
      }
      .skipped > .status {
        color: orange;
      }

      .min-width-150 {
        min-width: 150px;
      }

      /* Metadata card styling - minimal custom styles */
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }

      .metadata-item {
        text-align: center;
        padding: 6px 8px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
      }

      .metadata-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
        opacity: 0.7;
      }

      .metadata-value {
        font-size: 0.8rem;
        font-weight: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      /* Seção Database Operations (RF08) */
      .db-note {
        font-size: 0.75rem;
        opacity: 0.75;
        margin: 0 0 12px 0;
      }

      .db-filters {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .db-empty {
        font-size: 0.8rem;
        opacity: 0.7;
        padding: 8px 0;
      }

      .db-operation {
        border: 1px solid rgba(128, 128, 128, 0.25);
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 10px;
      }

      .db-operation-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .db-sgbd {
        font-weight: 600;
        font-size: 0.8rem;
      }

      .db-meta {
        font-size: 0.7rem;
        opacity: 0.7;
      }

      .db-copy {
        margin-left: auto;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(128, 128, 128, 0.4);
        background: transparent;
        cursor: pointer;
        color: inherit;
      }

      .db-sql {
        background: rgba(0, 0, 0, 0.06);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        overflow-x: auto;
        margin: 0 0 8px 0;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .db-details {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 0.72rem;
        opacity: 0.8;
      }

      /* Linhas devolvidas pela consulta (aba Database Operations) */
      .db-rows {
        margin-top: 8px;
      }

      .db-rows-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .db-rows-json {
        max-height: 320px;
        overflow-y: auto;
      }

      .curl-command {
        background: rgba(0, 0, 0, 0.04);
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
        font-family: 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
        font-size: 0.8rem;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <n-config-provider :theme="theme">
        <n-layout embedded position="absolute" content-style="padding: 24px;">
          <n-card>
            <n-flex>
              <n-page-header title="Marrone run dashboard">
                <template #avatar>
                  <n-avatar size="large" style="background-color: transparent">
                    <img v-if="logo" :src="logo" alt="logo" style="max-height: 40px; max-width: 160px; object-fit: contain;" />
                    <img v-else src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAVnklEQVR4nO1aCZBdVZn+zt3efft7/XpLdyfd6bBkJcMSAlEnCaAGWUoJaS1GKUtxAZ0akVKsGaBpZ1NxakrHpRAcR4IypFkUURQwJCHREAghId0J2brTS3p9+3L3e6f+c1+HhoLQEVCrpv+u16/7Luecf/v+5RxglmZplmZplmZplmbp/ymxd2Es783ud3Z2siW9vaxn8ThbM+3Glur3kt56r2dxt9fVBfdtzPNnJ6H6mSJx2iLZpg0bxM7O1RJjM5c1PUvvdHZ2Th+XVceePs/0+392C2DVBTjV/2MANAAW/bN69Wpp27ZttuedVJRww6ULz5hTnzo7Egm0K1KgkYkIw/M8y3ZKhmEMF4qVvr7B8YPduwb6pl7yPI+tWbNG3Lp1q129pAKQAJSmCcJ5O0z8KXRyUkmSVibj8TsUNXCe6zqlSqXycF2d/G9HjmQKdP/W9cvXtLQ0r6+rrVmbSCTOqksl5Gg0hICiQBAYMQjbcaAbJoqFMiYzOT2XKx6cmEg/dajv+MM/+M2B52ic5a3xxPGsc3swHF7PGFMMw9xWKGT+2bLQU+WDPqdynXdEAKzKPGlDiYaDt8cTNV9LJBKSIIrwXBeua+Nw39Cey89t+EnHBy68fm7LnAta5zVBDYbgwoMgCLbruJ7r0lo90Bd5hygKYIIgeK4nMnjQKhqO9Q9jaGj02Xt/sePnzx/L3tTe2rJMFCX+gm3bKBSylXy+8PVSqXJXlXmpqhjv3RCA+KrWsSqRSH63piZ1vqoGaTJHMywBHjzTtNwl7Q3yLde9B8sWtsF0QNw6ruMITGCsXKowJSBDkWW4jgvyEFGWoGsabNtCOBImOXqSKLpMECRFENhz+47ih48+h55jo1ZAkUXHc6HKEq1F1g0NuWx2Ry6Xudm28fzr1/pOCIBN8/VoJBK+Ix6PfTmRSNI1izFIpYqGlCrCchxc88GV+Nz697iyrLjFiiaA9MoB0EMgoODwK0dhmjrOXngWGKMhGEqlMvbv70X7gnmoq6+DZflr91wPApOcaDjoGZYl/LD7WaH7N9sRUmSkDQfhkC98eJDzhbxVyOe/XSyW/xVAuSoE38zehgCEKb9SFOXKeDx2VzJRs1AJKK7t2B4DBMN2UCM5+PKVK9F81hwsWrwAFc2E63rg5spRnYOZvxLPQ/+xflTKZRoTpuXAMEzMm9eEuoY6mBZhKCNXgcD8j+O6EAUBqqqgp+cwJvrGcNcv/oAJE2QJ9LwjSZJoGAbL57MHcrnCV0zT/PXreThdAQjVF+fE47FvJRPJj0ejMWLCch1Hcj0XsiRhIpPFNec14foNl6C5tQWGafoLF6oRihj3uO/7oEc4wATous79nP6OxsIgDLFtf50Odw0SoMgZp1WSqxBuKIEAxkfGsLF7M+7ffgh1qRrYjkuh0xMFgbtFqVREoZC7L5stfBXA2KmEwE7FvCRJK2qSiUdSqdoWSZYcH7i43XKyXQ9uKY3vf60DS5Ytgq4ZEDmEMf5D1ifLMmemXC7D0A3IioRwOMTv8RDpeWCCyN2hVCzDth0EQ0GoqgrXdeC4DhjzrdhzfSEEVBV9x47jc1/fCEOMIaCIJ62L1i2IAhzbFjOZ9GCxmFuvafbzbyYEdgqhxOvqUvsaGubMJWxzHVeenswoiowTY5P4/NXn4eZPXYVMrsw1dnKxBJaihInxSZwYPsEHlWUFlmXyGdoXtCISjXDGc9k8jhzqgySKXGC2Y0MJKGie24RQKMiF4AuLXmVwPQ+pRAz3bHoKd92/DU2NDbBsy3cz7moeBFGwBAjK+PjY0MTE5DIA+erSvbcSgETKVVW1o7m5+cFQKGQ6jiv7ZuhrjEDN8QDJ0/HQf9xIYMR93vd1l4c7WZTQ39ePQr6A+e1tLBaLQxLJnBlGRsYw2D+AVG3CsxwXkxNpnHFGO+ob6vkclmVzwWm6jnmtLXAch4/PTVMgEQjc0ujS+pt/gIIBBBSZP8fXWOVKEiVL1zRlaHjgOl23Hpji7fWm/oYkSUJcEASXMjEmvFZOoiQik8vjivcuRkNtAqZpvwp09HE9Dma1dbVYtnwpi8Wj8DwH5UoJ42NjmNPUgKXLl3CFioLAzjt/OWtorEc6k0U+XwC5/ZymerS2zeVMEXHrq35oPZQ8JaIhfHjtcmTzBZ5HvEqMW5bvXYLLmBR/Yy7xhgLgotZ1s8c0Dbovklan3eJgFVaAay5bwRGfUIF80ze+qqe5HqLRKOU2PGkhM5YVBYODQ1wIiiKhbUEb2s+cDzkgoVQusf4jxxhdJ983yVXAwY3PS19keVPYQuOWNQNXrz0XNREFumHxZ09+fGsRTdMULEt7+TUMvIUAXBKhbdu7K5VKn+d5lJ2RJfDXZUlENl/EJReciTPb5kAn1K8iNZ/BBSRZhqKqLD2ZRt+RPliGDYGJEAQRbfPbMTI8yleiaQYqmsYjwNDAEOobahGOhBiYyAhvc9kCH5eQn57nQq4qg1jUDBNzG1NYt2oRt0iKGFNu6tuhJ1QqlX7bxgtvlipLb2IBdN2oVMoPWJb5j6Ik8yyWxiC/Y66Jj627EJbt8Ek5MLm+tqKRELLpDF7eux/Dg0MwDRP1jY1Yc+lqvvhohNwBMHQTkiRyU7YtB1pFR1NzE0zD5it4bvsf2ejIGGLJhHfGme1YsGA+JFVCRTP4XGTy5JmabuDa96/AI5v38rE4Ax63FtcyLVHTKg8SL2/k/6fCAC6pclm7t1Qs6gKpDvB87Zdw8bJ5OHdxG8qazpkmE6fUlgqcp7bsxL33PcQOvnIYQVVGKBzCxPg4Bo4PQJYl7t8iE3gaLAoU50W4jp8bUOJE1jM0MIgTQ0NcQFalxLY9uws/vv8x7HrpIBRZ5IBHzJJbVHQDixe04JIVZyGTK/LcxCPgEgSxVCqaxWL5x9N5mokFTD1MTPeVK5XueML5hChKmuN5Acsos8+sfx/PznzEthAMqjg+PIFbv3Ef9vQM8MInHlWx8uwarD6nBSS+0dERtJ/ZCsu2/WRJFHgCQ0SMu2A8TwhHIhgbHePpBjH65K4jeHb/CDNMeKFHXsTCMxpw2xc+gkULWjjzZAmmbeOGa1bj97sOwXY8T5Ykw3GcYLlc/BWAw6eqDQS8OZErCHq+0JXNpAue6wSHT4wIn776Qqw4ZwEKZY07FWk+X6zgxtvuxfJVV+Hxp57GooWLUKm4+O0Lo9jeMwQ1IKNYLkO3TK65+QvmIREPcxRPxqKIhlTMb5vHkZtCYKWiIRxUsWVPHyakufjpg49i3eUfAlyGlw9O4It3/hRjk1kEZIlbgW4YWHZWC77Y8bcYHRsRHNcOptOT5UqleHvV99+0HhBOIQCuHgM4qumltUeP9d+26ozYTz951UqUddOlUEQJCfn8r55+AUMnyvj0DZ/A6rWr0TZ/PkxdQywUwh96xpEt6ZAlGfFIGJFwEGXLw++2v4z7f7UDGx/bjie27UHJtFFTE0MsEuJuUDEdbNszgGvXb8C6D63DhRddRC6J+lQCQyNFPPjrHQiHlGrNwVA2DPe6yy9g65bXP3j0aP+tjl5aY5o4MJ2X03GB10SEUlF70XG9Fz+69pzvhEJhQmhXYIR+DIZpYP/B4zxj+4eb/h6LFi9m2zZvQzQS53Kv6AzZooFVTXV4fOs+PPDrnTg0MAnNpEaAUNWNi1BAwNmtdbjuilWY11SPVw4fA5QQ/ufue9B3+DCe/M0TLBFPeoZuIRaJYm/vAI8i5ErVYsFVAqq47uLF3gPPHPxW1uZh6ZTaxwx7at4D/3st+ZDkiMpKSVGqYdmPt6ZpolypIBQK4cjBQ3j4gYc4sDEmQhIVNCRTyGsWvv6Trbjl24/iwEABoUgC8VgEQUVCSJWQjEcRCEWxvz+LL327G7f96Hco6Dbi4QBGR0aw8d7/RqlYgCJLcBwbDakGOBQ5KIQSoBIW2bYgSCKYrJxLnnn77XfMqF8ozeAZ1tHxEK+yIpFQPcV8j/niJUlQvj8nFURvn4ZkIoGyVobjmjxcttS2Il+ZxOO7MwiEUmhpbAQ1MNKTkwiHVdTUxHkOPzY2wUeLRiOIR2vRP6Hh+GgOgqkjoIQ5hlBGqJs66mvqIAoMtXGZ1xYn474HRkVYJBRKtQPBrq6uPEXsmdT7p6Sp0qY1jrAsS1GPUR+PMb+ZQSOIWL1iIWJBHcFgHLXJeiTiNWhrboPhaJiolJGqa0JIFZEv5JHOZiDJIs4/71ycs3QJ5syZQxkj9RaRzeaRy+URVESEYylUEICkiEhEU4hFkmhpnMuCoRgsaxSXXrQQkhyo5v5+jUEUCCjhMxao1KDFnZ1v3fCRMEMKuhS+mUhdENKuWHUBMsllSxfi2rVDeOr5PhT0ABRFREkbxXChiMY5zTB0DYZhIBQOw3ZNbspbn93OrYe3dKj6kwNQAwFEIlGUyyXIjoP6ugaMTYwiyvKoicVg2hqCUhZXXHI2LlrxN34oribHU78FJohBKSAC+oz4kt7qgSkRThRhOg5MqnZfFatflISjEVx26fvQWBtH/+Aoz9kf3plFPEntLZObeTQWpeYYzwYLxSJKxRIaGhp56BvLZhEOUbND4ZaQSCRQKlNvwEIyWQ/TzmHdBXHu7y1USJ2zFLF4rJoMCa/BOcd17WLZ5K35mZAwk4dI02lQpDHz9Dc1b/kN7n4MlmmhJlWDCy++CB9bf4VXRBjDeSCkkokCQeoIk7ZcF8EQ3wpAIpHkZS0JMZmo4VKl5+ibng2HQhzhQ6qMtCbjWA7YcM06rLj4QiRTNRwTXmXeVwn91g2juHdI4y35O7veujsszIB/z3U5orq6pg1SH1tgzOMRjATAu0SAbVkIh1SYTMbjO4+iNpnkrS1RkHiqSx/HdqEGgqhJpjhzhqnDMGgvxRcIRZKpqpKqR+KImiN1qTie3jOIkbyGaDTIbMfi1uRXx2T8VPdydaBSrpxIA0Vexs+gPS7MQADYcucW/ly+UNxv6IYnCMzf8JlaAAcgxrO3nzyyFZMFgyN39QFe7U21vcgFqKWVqknx7o8kS0jVpngLjDPNW2XwOFsumTSVvoDpCrh70xbIkh/2aBxe8/lFKqXErm0ayOfye/01r5m+jfb2BDDRW88lOTIyuW0inaEGCaOancceYpAx3rEdGs3giR0HSPue759+d9elv6d1E6daXFQcUfFC2RwVVJ5LWwi8lmWUEk8RNVcoV9j6Uj96jlBqLfH8n/qHfonskaWxTCaH4RMTW6ZvuL4jAtjQ3c3t/KXnDm3pPz6cZfAkj1oElCjyqOAhrKrYsusAMiUTgYDM7ZGYT6cnkMmkedFCLkHITUBK/cOCpqFQ0Xg0oBYaX44HRkCYz+WQpvdI/R6DSFmnzfDE9pc9lbe/qk1VHgdoLiYeOTZQ2bWv92m+6K6t7jsHgoC3adMG8cmhQmZ4eORx2zAp23P8+X03I8ae6+mDGlRBHPIWuOsgEolw5vP5HLcIyhIN18Xx8TFc3tSEDe3tGBgfRdmiMQWeX+SyWY4R5CYkXG5FJORgELt7B6HpJmSRGizUE2BUNjuuZbGhwRNPbj6sDdNau2a4TyhhhtTd7X+/3HPsvxYt7Pv44qVnC7ZmVPt0hL4mxrMlbtZk4mTWVJcH1RBTFRXZbAa5bIbjQKOq4ub3vg+XtLVBAsOKufNwz4svoC894beyRBGpVC0X2LTdZciKjExBR1kzeYThGuCupLBXDryCAweP/uf0tc6EhJkLoNshyd7z+0PPv9xz6JeuaYqyJHFH5f4siQhWU1Z/k9T3Tdt2qDeF2to61KZqkS+X0Pn+9+OmK65EOJmCFAnjk5dchlve+7fIlApIpWo48/SuP8bU5opLWOKpAX8esghCf1GQHMcwpT0v9T7xg6cOb/O8ToHW+o4LgKinZzFvtry4u+cru/f0VNSAIvAUnPf8Raxc2oZiscxLXx4kXm1SegRqhXyet9OfGRjkKXRjIonmukYgFML2sVHubOn0JEzT4C7kk0e7qxws07k8Vi6Zh0hE5Y0Vx3U9NRjAzl0vGrtf2HsLre3OO3FaJJ3Ow11dXe6S3l7x/p1DR+a17r95bnPD3S2trWapVJGLZR0fvfwiPLZ1H0ayBdQmY7xnSORYNorFomeaJksEQ9j4/C7MSyTQce75nOkHt2/l12rCUZ41TkyMg/YRVDXIXYzcajyd99rqw7hh/WqUyjq3iHA4bvcf7VN27Nr75Y3PjR64qqND7DoN7f/JByTo+EpX11b73z+99vsfvnLNTcm6erNYqsjhYAADIxn83a13I6/ZqIlHedPSse2TxUr1XAArmybqI2FuKROlMsKBgG9LhLgulbcWB8+gqnqT2SLmNcTw829+Bg2pGCqGjXAobI0NDSmPPr75nq6f/fGznatXS12vniJ510+IsE2bNggdHd3ON29Ys/HySy/+eF1zk1XWLTEaCrDDx8dxwx0/xtGhNOpSVJhR13gKzPyyhcKbxRMfMEJ08mk/l/PLG5ESHsf1xtM5LF3QiB91Xs9b4GXD9oKyZA/3H1d+u3nnQ7dv3NFRXctbboW/kwIgYl5nJ2NdXe6/fGLV9963ctkX5rW3eq6oOKFQUMyVdHR9/1H88pk9HNXDaoDv/XFkp7e5tqfH8qktcTpn4KJY1iAJHjo+cB6++qkPIagqqJR1B5YhHj/Wz3bs7r2n82d//LzX2QnW1eUP8hc4JsemhPBPH11x45IFLXctW9QeFtSgowZDnhoKiltfeAX3PbYDLxwYQkm3eR5AiQ41Naa203hK5Xont8HiIRkXL52L669ehQuXzkexVHEsXYetVaR9B/u1nqODX/1G9+7v8Xzfdy3vL3lOkG3asEHo6O52bvjgoiXL5jd/88zWhivm1CfheMyLRoK2bTnC4aEJ9tLhUXZocBInMiXkywaM6kkQRRaQjKhoTkWxqLUW5541x5vfWEObBW6pYkjUgzoxlsGh4yNP7j1y4iv3bT60j47fdfgZqvdXcVByk78gztGtHzn/itaW1JcaahOXNTfU8A0TvnEiizbtsdGpEN20GOXytHpZFKh48qhRQlFTNx2JwpyumxgYTXsj45nN/Scy3/3OY3see/1cf00nRdHZCeFOcJ/kaeiN65asaGuqvbY2EV0XCQcXp5IRKRJSuTCoFqA0lkBvyvwNw0KxoiOdLxmFYqV3Ilf47fGByYfvfebgbhrPj/Pkcad/HO7PIoApIg1t2LTJpQRo6tpnV5+1sLExuTwSVheraqBVlIR6AQh7HhWWbsly7ImKZh4rlbXeweHsvvt3Hj0y9S4x3tHRcVoZ3l8FdXZ2Cv4x2dN/902Oy77jxN7NwafPQ9EKW1YLqJ6SXrKk3tvQs5hbSPeSXtbTM85O48D0LM3SLM3SLM3SLM3SLOFt0v8BVIXc9Sjq+WcAAAAASUVORK5CYII=" alt="logo" style="max-height: 40px; max-width: 160px; object-fit: contain;" />
                  </n-avatar>
                </template>
                <template #extra>
                  <n-flex justify="end">
                    <n-switch v-model:value="darkMode" :rail-style="darkModeRailStyle">
                      <template #checked> Dark </template>
                      <template #unchecked> Light </template>
                    </n-switch>
                  </n-flex>
                </template>
              </n-page-header>
              <n-tabs type="segment" animated v-model:value="currentTab">
                <n-tab-pane name="summary" tab="Summary">
                  <n-flex justify="center" vertical>
                    <!-- Run Information Card using Naive UI components -->
                    <n-card title="Run Information" size="small">
                      <div class="metadata-grid">
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Date & Time</div>
                          <div class="metadata-value">{{ runCompletionTime }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Version</div>
                          <div class="metadata-value">{{ marroneVersion }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Environment</div>
                          <div class="metadata-value">{{ environment }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Total run duration</div>
                          <div class="metadata-value">{{ totalDuration }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Total data received</div>
                          <div class="metadata-value">{{ totalDataReceived }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Average response time</div>
                          <div class="metadata-value">{{ averageResponseTime }}</div>
                        </n-card>
                      </div>
                    </n-card>
                    <x-summary v-for="(result, index) in res" :res="result" :key="index"></x-summary>
                  </n-flex>
                </n-tab-pane>
                <n-tab-pane name="requests" tab="Requests">
                  <n-flex justify="center" vertical>
                    <x-requests v-for="(result, index) in res" :res="result" :key="index"></x-requests>
                  </n-flex>
                </n-tab-pane>
                <n-tab-pane v-if="databaseOperations.length > 0" name="database" tab="Database Operations">
                  <x-database-operations :operations="databaseOperations"></x-database-operations>
                </n-tab-pane>
              </n-tabs>
            </n-flex>
          </n-card>
        </n-layout>
      </n-config-provider>
    </div>
    <script type="text/x-template" id="database-operations-component">
      <n-flex justify="center" vertical>
        <n-card title="Database Operations" size="small">
          <p class="db-note">
            Operações de banco executadas pelos scripts de pré e pós-requisição.
            Os parâmetros aparecem redigidos por padrão — o relatório é um artefato compartilhável.
          </p>

          <div class="db-filters">
            <span class="metadata-label">SGBD</span>
            <n-select v-model:value="sgbdFilter" :options="sgbdOptions" clearable placeholder="Todos" style="max-width: 220px;" size="small" />
            <span class="metadata-label">Status</span>
            <n-select v-model:value="statusFilter" :options="statusOptions" clearable placeholder="Todos" style="max-width: 220px;" size="small" />
            <span class="metadata-label">{{ filtered.length }} de {{ operations.length }} operação(ões)</span>
          </div>

          <div v-if="filtered.length === 0" class="db-empty">
            Nenhuma operação de banco corresponde ao filtro.
          </div>

          <div v-for="(operation, index) in filtered" :key="index" class="db-operation">
            <div class="db-operation-header">
              <n-tag size="small" :type="operation.status === 'error' ? 'error' : 'success'">
                {{ operation.status }}
              </n-tag>
              <span class="db-sgbd">{{ operation.sgbd }}</span>
              <span class="db-meta">{{ operation.timestamp }}</span>
              <span class="db-meta">{{ operation.durationMs }} ms</span>
              <span v-if="operation.requestName" class="db-meta">{{ operation.requestMethod }} {{ operation.requestName }}</span>
              <button type="button" class="db-copy" @click="copySql(operation, index)">
                {{ copiedIndex === index ? 'Copiado!' : 'Copiar SQL' }}
              </button>
            </div>

            <pre class="db-sql">{{ operation.sql || operation.operation || '-' }}</pre>

            <div class="db-details">
              <span>Parâmetros: {{ formatParameters(operation) }}</span>
              <span>Resultado: {{ operation.resultSummary || (operation.operation ? operation.operation : '-') }}</span>
            </div>

            <div v-if="operation.resultRows && operation.resultRows.length" class="db-rows">
              <div class="db-rows-header">
                <span class="metadata-label">Linhas</span>
                <span class="db-meta" v-if="operation.resultRowsTruncated">
                  mostrando {{ operation.resultRows.length }} de {{ operation.resultRowsTotal }} — as demais foram omitidas
                </span>
              </div>
              <pre class="db-sql db-rows-json">{{ formatRows(operation.resultRows) }}</pre>
            </div>

            <n-alert v-if="operation.status === 'error' && operation.error" type="error" size="small">
              {{ operation.error.code ? operation.error.code + ' — ' : '' }}{{ operation.error.message }}
            </n-alert>
          </div>
        </n-card>
      </n-flex>
    </script>
    <script type="text/x-template" id="summary-component">
      <n-flex vertical style="margin-bottom: 50px;">
        <n-card>
          <template #header>
            <span style="font-size: 24px;">{{ iterationTitle }}</span>
          </template>
          <n-flex justify="center">
            <n-flex justify="center">
              <n-alert type="success">
                <n-statistic
                  label="Total requests"
                  :value="summaryTotalRequests"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryErrors ? 'error' : 'success'">
                <n-statistic label="Total errors" :value="summaryErrors">
                </n-statistic>
              </n-alert>
              <n-alert type="success">
                <n-statistic
                  label="Total Controls"
                  :value="summaryTotalControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryFailedControls ? 'error' : 'success'">
                <n-statistic
                  label="Total Failed Controls"
                  :value="summaryFailedControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert type="warning" v-if="summarySkippedRequests">
                <n-statistic label="Skipped requests" :value="summarySkippedRequests">
                </n-statistic>
              </n-alert>
            </n-flex>
          </n-flex>
        </n-card>
        <n-data-table :columns="summaryColumns" :data="summaryData" />
      </n-flex>
    </script>
    <script type="text/x-template" id="requests-component">
      <n-card>
        <template #header>
          <span style="font-size: 24px;">{{ iterationTitle }}</span>
        </template>
        <n-flex vertical style="margin-bottom: 50px">
          <n-switch
            v-model:value="onlyFailed"
            :rail-style="railStyle"
          >
            <template #checked> Only Failed </template>
            <template #unchecked> Show All </template>
          </n-switch>

          <n-collapse>
            <x-result v-for="result in results" :result="result.value" :index="result.index" :key="result.index"></x-result>
          </n-collapse>
        </n-flex>
      </n-card>
    </script>
    <script type="text/x-template" id="result-component">
      <n-collapse-item
        :name="resultTitle"
        arrow-placement="right"
      >
        <template #header>
          <n-alert
            :type="getAlertType"
            :bordered="false"
          >
            <template #header>
              {{result.path}} - {{resultSummary}} {{hasError && result.response.status !== 'skipped' ? " - (request failed)" : "" }}
            </template>
          </n-alert>
        </template>
        <n-flex vertical>
          <n-grid x-gap="12" :cols="2">
            <n-gi>
              <n-card title="REQUEST INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="File"
                      :description="result.path"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request Method"
                      :description="result.request.method"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request URL"
                      :description="result.request.url"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="RESPONSE INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="Response Code"
                      :description="responseCode"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Response time"
                      :description="result.response.responseTime + ' ms'"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Test duration"
                      :description="testDuration"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
          <n-card v-if="result.curl" title="CURL COMMAND">
            <template #header-extra>
              <n-button size="tiny" quaternary @click="copyCurl">Copy</n-button>
            </template>
            <pre class="curl-command"><code class="language-bash">{{ result.curl }}</code></pre>
          </n-card>
          <n-alert v-if="hasError || (result.response.status === 'skipped' && result.error)" title="Error" type="error">
            {{result.error}}
          </n-alert>
          <n-card title="REQUEST HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataRequest"
            />
          </n-card>
          <n-card
            v-if="result.request.data"
            title="REQUEST BODY"
          >
          <iframe
            v-if="result.request.isHtml"
            :srcdoc="result.request.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.request.data }}</pre>
          </n-card>
          <n-card title="RESPONSE HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataResponse"
            />
          </n-card>
          <n-card
            v-if="result.response.data"
            title="RESPONSE BODY"
          >
          <template #header-extra>
            <n-button size="tiny" quaternary @click="copyResponseBody">Copy</n-button>
          </template>
          <iframe
            v-if="result.response.isHtml"
            :srcdoc="result.response.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.response.data }}</pre>          </n-card>
          <n-card title="ASSERTIONS INFORMATION">
            <n-data-table
              :columns="assertionsColumns"
              :data="result.assertionResults"
              :row-class-name="assertionsRowClassName"
            />
          </n-card>
          <n-card title="TESTS INFORMATION">
            <n-data-table
              :columns="testsColumns"
              :data="result.testResults"
              :row-class-name="testsRowClassName"
            />
          </n-card>
        </n-flex>
      </n-collapse-item>
    </script>
    <script>
      const { createApp, ref, computed, onMounted } = Vue;

      const getFilteredRequestResults = ${getFilteredRequestResults.toString()};

      function mergeTests(runnerResults) {
        if (!Array.isArray(runnerResults)) return runnerResults; 

        runnerResults.forEach(iteration => {
          const { totalTests, passedTests, failedTests, totalPreRequestTests, passedPreRequestTests, failedPreRequestTests, totalPostResponseTests, passedPostResponseTests, failedPostResponseTests } = iteration.summary;
          
          // Merge summary test counts
          iteration.summary.totalTests = totalTests + totalPreRequestTests + totalPostResponseTests;
          iteration.summary.passedTests = passedTests + passedPreRequestTests + passedPostResponseTests;
          iteration.summary.failedTests = failedTests + failedPreRequestTests + failedPostResponseTests;
          
          // Merge individual result test arrays
          iteration.results.forEach(result => {
            result.testResults = [
              ...(result.preRequestTestResults || []),
              ...(result.postResponseTestResults || []),
              ...(result.testResults || [])
            ];
          }); 
        });
        
        return runnerResults;
      }

      const App = {
        setup() {
          function decodeBase64(base64) {
            const binary = atob(base64);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            return new TextDecoder().decode(bytes);
          }
          const rawResults = JSON.parse(decodeBase64('${resutsJsonString}'));

          const res = computed(() => {
            return mergeTests(rawResults.results);
          });

          const marroneVersion = computed(() => {
            return rawResults.version || '-';
          });

          const logo = computed(() => {
            return rawResults.logo || '';
          });

          const environment = computed(() => {
            return rawResults.environment || '-';
          });

          const runCompletionTime = computed(() => {
            if (rawResults.runCompletionTime) {
              return new Date(rawResults.runCompletionTime).toLocaleString();
            }
            return '-';
          });

          // RF08: operações de banco executadas pelos scripts, já redigidas pelo host.
          const databaseOperations = computed(() => {
            const operations = rawResults.databaseOperations;
            return Array.isArray(operations) ? operations : [];
          });

          const currentTab = ref('summary');

          const getTabFromQueryParam = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tab = urlParams.get('tab');
            return tab && ['summary', 'requests'].includes(tab) ? tab : 'summary';
          };

          onMounted(() => {
            currentTab.value = getTabFromQueryParam();
          });

          const darkMode = ref(false);
          const theme = computed(() => {
            return darkMode.value ? naive.darkTheme : null;
          });

          const totalDuration = computed(() => {
            const total = res.value.reduce((totalTime, iteration) => {
              return totalTime + iteration.results.reduce((sum, result) => sum + (result.runDuration || 0), 0);
            }, 0);
            return total > 0 ? Math.round(total * 1000) / 1000 + 's' : '-';
          });

          const totalDataReceived = computed(() => {
            const bytes = res.value.reduce((total, iteration) => {
              return total + iteration.results.reduce((sum, result) => {
                const responseData = result.response?.data;
                if (typeof responseData === 'string') {
                  return sum + new Blob([responseData]).size;
                }
                return sum + (JSON.stringify(responseData || {}).length || 0);
              }, 0);
            }, 0);
            
            if (bytes === 0) return '-';
            if (bytes < 1024) return bytes + 'B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
            return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
          });

          const averageResponseTime = computed(() => {
            let totalTime = 0;
            let count = 0;
            
            res.value.forEach(iteration => {
              iteration.results.forEach(result => {
                if (result.response?.responseTime) {
                  totalTime += result.response.responseTime;
                  count++;
                }
              });
            });
            
            return count > 0 ? Math.round(totalTime / count) + 'ms' : '-';
          });

          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode.value = true;
          }
          // To watch for os theme changes
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            darkMode.value = event.matches;
          });
          return {
            res,
            theme,
            darkMode,
            darkModeRailStyle: () => ({ background: 'var(--n-rail-color)' }),
            currentTab,
            marroneVersion,
            logo,
            environment,
            totalDuration,
            totalDataReceived,
            averageResponseTime,
            runCompletionTime,
            databaseOperations
          };
        }
      };
      const app = Vue.createApp(App);

      app.component('x-database-operations', {
        template: '#database-operations-component',
        props: ['operations'],
        setup(props) {
          const sgbdFilter = ref(null);
          const statusFilter = ref(null);
          const copiedIndex = ref(null);

          const sgbdOptions = computed(() => {
            const unique = Array.from(new Set(props.operations.map((operation) => operation.sgbd).filter(Boolean)));
            return unique.map((sgbd) => ({ label: sgbd, value: sgbd }));
          });

          const statusOptions = [
            { label: 'success', value: 'success' },
            { label: 'error', value: 'error' }
          ];

          const filtered = computed(() => props.operations.filter((operation) => {
            if (sgbdFilter.value && operation.sgbd !== sgbdFilter.value) return false;
            if (statusFilter.value && operation.status !== statusFilter.value) return false;
            return true;
          }));

          const formatParameters = (operation) => {
            if (!Array.isArray(operation.parameters) || operation.parameters.length === 0) {
              return '-';
            }
            return operation.parameters.join(', ');
          };

          // Linhas devolvidas pela consulta. Já vêm normalizadas pelo host (Date → ISO,
          // Buffer → base64) e limitadas a 20 por operação (MAX_RECORDED_ROWS, em
          // @marrone/database); o total real vem em resultRowsTotal para o aviso de corte.
          const formatRows = (rows) => JSON.stringify(rows, null, 2);

          const copySql = async (operation, index) => {
            const sql = operation.sql || operation.operation || '';
            try {
              await navigator.clipboard.writeText(sql);
              copiedIndex.value = index;
            } catch (err) {
              copiedIndex.value = null;
            }
          };

          return { sgbdFilter, statusFilter, sgbdOptions, statusOptions, filtered, formatParameters, formatRows, copySql, copiedIndex };
        }
      });

      app.component('x-summary', {
        template: '#summary-component',
        props: ['res'],
        setup(props) {
          const summaryColumns = [
            {
              title: 'SUMMARY ITEM',
              key: 'title'
            },
            {
              title: 'TOTAL',
              key: 'total'
            },
            {
              title: 'PASSED',
              key: 'passed'
            },
            {
              title: 'FAILED',
              key: 'failed'
            },
            {
              title: 'SKIPPED',
              key: 'skipped'
            },
            {
              title: 'ERROR',
              key: 'error'
            }
          ];
          const summaryData = computed(() => [
            {
              title: 'Requests',
              total: props.res.summary.totalRequests,
              passed: props.res.summary.passedRequests,
              failed: props.res.summary.failedRequests,
              skipped: props.res.summary.skippedRequests,
              error: props.res.summary.errorRequests
            },
            {
              title: 'Assertions',
              total: props.res.summary.totalAssertions,
              passed: props.res.summary.passedAssertions,
              failed: props.res.summary.failedAssertions,
              skipped: '-',
              error: '-'
            },
            {
              title: 'Tests',
              total: props.res.summary.totalTests,
              passed: props.res.summary.passedTests,
              failed: props.res.summary.failedTests,
              skipped: '-',
              error: '-'
            }
          ]);
          const summaryTotalRequests = computed(() => {
            return props.res.summary.totalRequests;
          });
          const summaryTotalControls = computed(() => {
            return props.res.summary.totalTests + props.res.summary.totalAssertions;
          });
          const summaryFailedControls = computed(
            () => props.res.summary.failedTests + props.res.summary.failedAssertions
          );
          const summarySkippedRequests = computed(() => props?.res?.summary?.skippedRequests || 0);
          const summaryErrors = computed(() => props?.res?.results?.filter((r) => r.error || r.status === 'error').length) || 0;
          const totalRunDuration = computed(() => props.res?.results?.reduce((total, result) => result.runDuration + total, 0));
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            summaryColumns,
            summaryData,
            summaryTotalControls,
            summaryTotalRequests,
            summaryFailedControls,
            summarySkippedRequests,
            summaryErrors,
            totalRunDuration,
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-requests', {
        template: '#requests-component',
        props: ['res'],
        setup(props) {
          const onlyFailed = ref(false);
          const filteredResults = computed(() => {
            return getFilteredRequestResults(props?.res?.results, onlyFailed.value);
          });
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            onlyFailed,
            results: filteredResults,
            railStyle: ({ checked }) => {
              const style = {};
              if (checked) {
                style.background = '#d03050';
              }
              return style;
            },
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-result', {
        template: '#result-component',
        props: ['result', 'index'],
        setup(props) {
          const copyCurl = () => {
            const text = props?.result?.curl || '';
            if (text && navigator.clipboard) {
              navigator.clipboard.writeText(text);
            }
          };
          const copyResponseBody = () => {
            const data = props?.result?.response?.data;
            if (!data) return;
            const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            if (text && navigator.clipboard) {
              navigator.clipboard.writeText(text);
            }
          };
          const headerColumns = [
            {
              title: 'Header Name',
              key: 'name',
              className: 'min-width-150'
            },
            {
              title: 'Header Value',
              key: 'value'
            }
          ];
          const assertionsColumns = [
            {
              title: 'Expression',
              key: 'lhsExpr'
            },
            {
              title: 'Operator',
              key: 'operator'
            },
            {
              title: 'Operand',
              key: 'rhsOperand'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];
          const assertionsRowClassName = (row) => {
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsRowClassName = (row) => {
            if (row.status === 'skipped') return 'skipped';
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsColumns = [
            {
              title: 'Description',
              key: 'description'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];

          function mapHeaderToTableData(headers) {
            if (!headers) {
              return [];
            }
            return Object.keys(headers).map((name) => ({
              name,
              value: headers[name]
            }));
          }
          const headerDataRequest = computed(() => {
            return mapHeaderToTableData(props?.result?.request?.headers);
          });
          const headerDataResponse = computed(() => {
            return mapHeaderToTableData(props?.result?.response?.headers);
          });
          const totalPassed = computed(() => {
            return (
              (props?.result?.testResults?.filter((t) => t.status === 'pass').length || 0) +
              (props?.result?.assertionResults?.filter((t) => t.status === 'pass').length || 0)
            );
          });
          const total = computed(() => {
            return (props?.result?.testResults?.length || 0) + (props?.result?.assertionResults?.length || 0);
          });

          const hasError = computed(() => !!props?.result?.error || props?.result?.status === 'error' || (props?.result?.response?.status === 'skipped' && props?.result?.error));
          const hasFailure = computed(() => total.value !== totalPassed.value);
          const testDuration = computed(() => Math.round(props?.result?.runDuration * 1000) + ' ms');
          const resultTitle = computed(() => props?.result?.path + ' ' + props?.result?.response?.status + ' ' + props?.result?.response?.statusText + ' ' + props?.index);
          const responseCode = computed(() => {
            if (props.result.response.status === 'skipped') {
              return '-';
            }
            return '' + props.result.response.status;
          });
          const resultSummary = computed(() => {
            if (props.result.response.status === 'skipped') {
              return props.result.skipReason === 'bail' ? 'Request skipped due to bail' : 'Request Skipped';
            }
            return totalPassed.value + '/' + total.value + ' Passed';
          });
          const getAlertType = computed(() => {
            if (props.result.response.status === 'skipped') {
              return 'warning';
            }
            return hasError.value || hasFailure.value ? 'error' : 'success';
          });
          return {
            headerColumns,
            headerDataRequest,
            headerDataResponse,
            assertionsColumns,
            assertionsRowClassName,
            testsRowClassName,
            totalPassed,
            total,
            hasFailure,
            hasError,
            testsColumns,
            result: props.result,
            testDuration,
            responseCode,
            resultTitle,
            resultSummary,
            getAlertType,
            copyCurl,
            copyResponseBody,
            iterationIndex: props?.result?.iterationIndex
          };
        }
      });

      app.use(naive);
      app.mount('#app');
    </script>
  </body>
</html>
`;

export default htmlTemplateString;
