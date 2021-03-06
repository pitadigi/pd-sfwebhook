export class PostResult {
    /**
     * 結果
     * true: 正常 / false: エラー
     */
    public result: boolean = true;

    /**
     * メッセージ
     */
    public message: string;

    /**
     * Apexクラスからの復帰値
     */
    public apexResult: string;
}
