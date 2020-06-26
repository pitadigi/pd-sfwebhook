import { SharedKeyCredential, StorageURL, ServiceURL, ContainerURL, BlockBlobURL, Pipeline, Aborter } from '@azure/storage-blob';

export class ConfigFile {
    private readonly aborter: Aborter;
    private readonly credentials: SharedKeyCredential;
    private readonly pipeline: Pipeline;
    private readonly serviceUrl: ServiceURL;
    private readonly containerUrl: ContainerURL;

    /**
     * Blobファイルにアクセスするための準備を行う
     */
    constructor() {
        this.aborter = Aborter.timeout(30 * 60 * 1000);
        this.credentials = new SharedKeyCredential(process.env.AZURE_STORAGE_ACCOUNT_NAME, process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
        this.pipeline = StorageURL.newPipeline(this.credentials);
        this.serviceUrl = new ServiceURL(`https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, this.pipeline);
        this.containerUrl = ContainerURL.fromServiceURL(this.serviceUrl, process.env.AZURE_STORAGE_CONFIG_CONTAINER_NAME);
    }

    /**
     * 指定したファイルのデータを文字列で返す
     * @param fileName ファイル名
     */
    public async getConfigFile(fileName: string): Promise<string> {
        const blockBlobUrl: BlockBlobURL = BlockBlobURL.fromContainerURL(this.containerUrl, fileName);
        const downloadResponse = await blockBlobUrl.download(this.aborter, 0);

        return await this.treamToString(downloadResponse.readableStreamBody);
    }

    /**
     * Blobデータを文字列に変換する
     * @param readableStream ダウンロードしたBlobデータ
     */
    private async treamToString(readableStream: any): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: string[] = [];

            readableStream.on('data', data => {
                chunks.push(data.toString());
            });

            readableStream.on('end', () => {
                resolve(chunks.join(''));
            });

            readableStream.on('error', reject);
        })
    }
}