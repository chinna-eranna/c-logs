package utils

import ("testing"
		"fmt"
		"os"
		"time"
		"github.com/stretchr/testify/require"
		//"github.com/golang-collections/collections/stack"
	)

func init() {
  
}

func TestPopulateBackPointers(t *testing.T) {
	pointersFile := "./_test/backPointers.txt"
	f, after := createFile(pointersFile, t)
	defer after(f, pointersFile)
	writeContents(f, t)

	lastByteOffset, err := f.Seek(1, os.SEEK_CUR)
	if err != nil {
		require.Nil(t, err, "Error while getting current offset", err);
	}

	pointersStack, err := PopulateBackPointers("./_test", "backPointers.txt", lastByteOffset, 5)
	if err != nil {
		require.Nil(t, err, "Error while getting pointers", err);
	}
	
	//File content has (two digits + newline) in each line,
	//Total 17 lines written, each offset is for every 5  lines Hence offsets would be
	//0, 15, 30, 45
	
	lastBackwardsPtr := pointersStack.Pop().(BackwardsFilePointer)
	nextOffset := int64(45)
	require.Equal(t, 2, lastBackwardsPtr.Lines, "Number of lines on last pointer should be 2")
	require.Equal(t, nextOffset, lastBackwardsPtr.Offset, "Offset didn't match")

	for pointersStack.Len() > 0{
		nextOffset  = nextOffset -  15 //each line has two digits + new line char, hence  3 characters * 5 lines per offset = 15
		backwardsPtr := pointersStack.Pop().(BackwardsFilePointer)
		require.Equal(t, 5, backwardsPtr.Lines, "Number of lines on last pointer should be 5")
		require.Equal(t, nextOffset, backwardsPtr.Offset, "Offset didn't match")
	}
}

func writeContents(f *os.File, t *testing.T){
	for val := 10; val < 27; val++ {
		_,err := f.WriteString(fmt.Sprintf("%d\n", val));
		require.Nil(t, err, "Error while writing the content", err);
	}
	
}

func TestFindNextFile(t *testing.T) {
	file1 := "./_test/findNextOldFile1.txt"
	f1, after1 := createFile(file1, t)
	defer after1(f1, file1)

	file2 := "./_test/findNextOldFile2.txt"
	f2, after2 := createFile(file2, t)
	defer after2(f2, file2)

	file3 := "./_test/findNextOldFile3.txt"
	f3, after3 := createFile(file3, t)
	defer after3(f3, file3)

	file,err := FindNextOldFile("./_test", "findNextOldFile3.txt", "findNextOldFile*")
	require.Nil(t, err, "Error while finding next old file", err);
	require.Equal(t, "findNextOldFile2.txt", file, "wrong file returned from FindNextOldFile")

	file,err = FindNextOldFile("./_test", "findNextOldFile2.txt", "findNextOldFile*")
	require.Nil(t, err, "Error while finding next old file", err);
	require.Equal(t, "findNextOldFile1.txt", file, "wrong file returned from FindNextOldFile")

	file,err = FindNextNewFile("./_test", "findNextOldFile2.txt", false, "findNextOldFile*")
	require.Nil(t, err, "Error while finding next new file", err);
	require.Equal(t, "findNextOldFile3.txt", file, "wrong file returned from FindNextNewFile")

	file,err = FindNextNewFile("./_test", "findNextOldFile1.txt", false, "findNextOldFile*")
	require.Nil(t, err, "Error while finding next old file", err);
	require.Equal(t, "findNextOldFile2.txt", file, "wrong file returned from FindNextNewFile")
}

func createFile(fileName string, t *testing.T)(*os.File, func(f1 *os.File, fileName string)){
    time.Sleep(1 * time.Millisecond)
	f,err := os.Create(fileName)
	require.Nil(t, err, "Failed creating the log file", err);
	return f, func(f *os.File, fileName string){
        f.Close()
        os.Remove(fileName)
    }
}

func TestFindOffset(t *testing.T){
	offsetFile := "./_test/findOffset.txt"
	f, after := createFile(offsetFile, t)
	defer after(f, offsetFile)
	writeContents(f, t)

	offset,err := FindOffset("./_test", "findOffset.txt", 2)
	require.Nil(t,  err, "Error while finding the offset", err)
	require.Equal(t, int64(4), offset,  "Could not get expected offset 4")

	offset,err = FindOffset("./_test", "findOffset.txt", 5)
	require.Nil(t,  err, "Error while finding the offset", err)
	require.Equal(t, int64(13), offset,  "Could not get expected offset 4")
}
