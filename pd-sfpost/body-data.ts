/**
 * SATORIからの送信データ
 */
export interface BodyData {
    /**
     * 事前に配布したトークン
     */
    token: string;

    /**
     * 契約ID
     */
    contract_id: string;

    /**
     * 呼び出すApexクラス
     */
    apex_class: string;

    /**
     * SATORIカスタマー
     */
    customer: string;
}