import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

export class ConfigFile {
    private blobServiceClient:BlobServiceClient;
    private containerClient:ContainerClient;

    /**
     * Blobファイルにアクセスするための準備を行う
     */
    constructor() {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        this.containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONFIG_CONTAINER_NAME);
    }

    /**
     * 指定したファイルのデータを文字列で返す
     * @param fileName ファイル名
     */
    public async getConfigFile(fileName: string): Promise<string> {
        const blockBlobClient: BlockBlobClient = this.containerClient.getBlockBlobClient(fileName);
        const downloadResponse = await blockBlobClient.download();

        return await this.streamToString(downloadResponse.readableStreamBody);
    }

    /**
     * Blobデータを文字列に変換する
     * @param readableStream ダウンロードしたBlobデータ
     */
    private async streamToString(readableStream: any): Promise<string> {
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