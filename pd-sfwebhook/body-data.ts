/**
 * SATORIからの送信データ
 */
export class BodyData {
    /**
     * 事前に配布したトークン
     */
    public token: string;

    /**
     * 契約ID
     */
    public contract_id: string;

    /**
     * 呼び出すApexクラス
     */
    public apex_class: string;

    /**
     * SATORIカスタマー
     */
    public customer: string;
}