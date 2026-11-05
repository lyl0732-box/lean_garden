package cn.leangarden.client;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

// Expose exactly one verified update file, read only, with a temporary URI grant.
public final class UpdateApkProvider extends ContentProvider {
  private File file(Uri uri)throws FileNotFoundException{
    if(!"/package.apk".equals(uri.getPath()))throw new FileNotFoundException();
    File file=new File(getContext().getFilesDir(),"updates/garden-update.apk");
    if(!file.isFile())throw new FileNotFoundException();return file;
  }
  @Override public boolean onCreate(){return true;}
  @Override public String getType(Uri uri){return "application/vnd.android.package-archive";}
  @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{
    if(!"r".equals(mode))throw new FileNotFoundException("Read only");return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.MODE_READ_ONLY);
  }
  @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order){
    try{File f=file(uri);String[] cols=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;
      MatrixCursor c=new MatrixCursor(cols);Object[] row=new Object[cols.length];for(int i=0;i<cols.length;i++)row[i]=OpenableColumns.DISPLAY_NAME.equals(cols[i])?"LeanGarden.apk":OpenableColumns.SIZE.equals(cols[i])?f.length():null;c.addRow(row);return c;
    }catch(FileNotFoundException e){return null;}
  }
  @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
  @Override public int update(Uri uri,ContentValues values,String selection,String[] args){throw new UnsupportedOperationException();}
  @Override public int delete(Uri uri,String selection,String[] args){throw new UnsupportedOperationException();}
}
